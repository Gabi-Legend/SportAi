const MESSAGE_CACHE = new Map();
const RATE_LIMIT = new Map();
const MAX_REQUESTS_PER_MINUTE = 25;
const CACHE_DURATION = 15 * 60 * 1000;
const REQUEST_TIMEOUT = 15000;

const FREE_PROVIDERS = [
  {
    name: "groq",
    priority: 1,
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ],
    apiKey: process.env.GROQ_API_KEY,
    maxTokens: 1000,
    temperature: 0.7,
  },
  {
    name: "ollama",
    priority: 2, // Backup local
    endpoint: "http://localhost:11434/api/generate",
    models: ["llama3.2:3b", "llama3.2:1b", "phi3"],
    apiKey: null,
    maxTokens: 800,
    temperature: 0.7,
  },
];

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = RATE_LIMIT.get(ip) || [];
  const recentRequests = userRequests.filter((time) => now - time < 60000);

  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  recentRequests.push(now);
  RATE_LIMIT.set(ip, recentRequests);
  return true;
}

function getCachedResponse(message) {
  const normalizedMessage = message.toLowerCase().trim();
  const cached = MESSAGE_CACHE.get(normalizedMessage);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  if (cached && Date.now() - cached.timestamp >= CACHE_DURATION) {
    MESSAGE_CACHE.delete(normalizedMessage);
  }

  return null;
}

function setCachedResponse(message, response) {
  const normalizedMessage = message.toLowerCase().trim();
  MESSAGE_CACHE.set(normalizedMessage, {
    response,
    timestamp: Date.now(),
  });

  // Cleanup cache
  if (MESSAGE_CACHE.size > 100) {
    const entries = Array.from(MESSAGE_CACHE.entries());
    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 20)
      .forEach(([key]) => MESSAGE_CACHE.delete(key));
  }
}

// Funcție pentru Groq API
async function callGroqAPI(message, provider) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    // Încearcă modelele în ordine până găsește unul disponibil
    for (const model of provider.models) {
      try {
        const response = await fetch(provider.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: "system",
                content: `Ești SportML Chat, asistent AI specializat exclusiv în sport.

🎯 Reguli stricte:
- Răspunde DOAR la întrebări despre sport (fotbal, tenis, baschet, handbal, atletism, înot, gimnastică, lupte, box, MMA, Formula 1, ciclism, volleyball, sporturi olimpice, etc.)
- Pentru orice alt subiect: "Îmi pare rău, sunt specializat doar în sport. Întreabă-mă despre fotbal, tenis, baschet sau alte sporturi!"
- Răspunsuri concise, clare și informative
- Ton prietenos și entuziast pentru sport
- Dacă nu știi o informație, spune deschis
- Fără formatare specială (*, /, !)

⚽ Concentrează-te pe: rezultate, clasamente, transferuri, statistici, istorii, recorduri, competiții, echipe, jucători.`,
              },
              {
                role: "user",
                content: message.trim(),
              },
            ],
            max_tokens: provider.maxTokens,
            temperature: provider.temperature,
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.choices?.[0]?.message?.content) {
            return {
              success: true,
              reply: data.choices[0].message.content.trim(),
              provider: `${provider.name} (${model})`,
              usage: data.usage,
            };
          }
        } else if (response.status === 429) {
          // Rate limit, încearcă următorul model
          console.log(`Rate limit for ${model}, trying next model...`);
          continue;
        } else {
          console.log(`Model ${model} failed with ${response.status}`);
          continue;
        }
      } catch (modelError) {
        console.log(`Error with ${model}:`, modelError.message);
        continue;
      }
    }

    return { success: false, error: "All Groq models unavailable" };
  } catch (error) {
    clearTimeout(timeoutId);
    return { success: false, error: error.message };
  }
}

// Funcție pentru Ollama (local)
async function callOllamaAPI(message, provider) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    // Verifică dacă Ollama rulează
    const healthCheck = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    });

    if (!healthCheck.ok) {
      return { success: false, error: "Ollama not running" };
    }

    const availableModels = await healthCheck.json();
    const installedModels = availableModels.models?.map((m) => m.name) || [];

    // Găsește primul model instalat din lista preferată
    const modelToUse =
      provider.models.find((model) =>
        installedModels.some((installed) =>
          installed.includes(model.split(":")[0])
        )
      ) || installedModels[0];

    if (!modelToUse) {
      return { success: false, error: "No suitable models installed" };
    }

    const response = await fetch(provider.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelToUse,
        prompt: `Ești SportML Chat, asistent AI specializat exclusiv în sport.

Reguli:
- Răspunde DOAR la întrebări despre sport
- Pentru alte subiecte: "Îmi pare rău, sunt specializat doar în sport"
- Răspunsuri scurte și precise
- Ton prietenos

Întrebare: ${message.trim()}
Răspuns:`,
        stream: false,
        options: {
          temperature: provider.temperature,
          num_predict: provider.maxTokens,
          stop: ["\nÎntrebare:", "\nQ:", "Întrebare:"],
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.response) {
        return {
          success: true,
          reply: data.response.trim(),
          provider: `${provider.name} (${modelToUse})`,
          usage: { total_duration: data.total_duration },
        };
      }
    }

    return { success: false, error: "Invalid Ollama response" };
  } catch (error) {
    clearTimeout(timeoutId);
    return { success: false, error: error.message };
  }
}

export async function POST(req) {
  const startTime = Date.now();

  try {
    // Rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : req.headers.get("x-real-ip") ||
        req.headers.get("cf-connecting-ip") ||
        "unknown";

    if (!checkRateLimit(ip)) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return new Response(
        JSON.stringify({
          error:
            "Prea multe cereri. Te rog să aștepți puțin și să încerci din nou.",
          retryAfter: 60,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }

    // Parse request
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: "Format de date invalid. Te rog verifică cererea.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message } = body;

    // Validare input
    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(
        JSON.stringify({
          error: "Mesajul este obligatoriu și trebuie să conțină text valid.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length > 2000) {
      return new Response(
        JSON.stringify({
          error:
            "Mesajul este prea lung. Maximum 2000 caractere pentru serviciile gratuite.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verifică cache
    const cachedResponse = getCachedResponse(trimmedMessage);
    if (cachedResponse) {
      console.log(`Cache hit for: ${trimmedMessage.substring(0, 50)}...`);
      return Response.json({
        reply: cachedResponse,
        cached: true,
        responseTime: Date.now() - startTime,
        provider: "cache",
      });
    }

    // Încearcă providerii în ordine
    const sortedProviders = FREE_PROVIDERS.sort(
      (a, b) => a.priority - b.priority
    );

    for (const provider of sortedProviders) {
      console.log(`Trying provider: ${provider.name}`);

      let result;

      if (provider.name === "groq") {
        if (!provider.apiKey) {
          console.log("Groq API key not configured, skipping...");
          continue;
        }
        result = await callGroqAPI(trimmedMessage, provider);
      } else if (provider.name === "ollama") {
        result = await callOllamaAPI(trimmedMessage, provider);
      }

      if (result?.success) {
        const responseTime = Date.now() - startTime;

        // Salvează în cache
        setCachedResponse(trimmedMessage, result.reply);

        console.log(`SUCCESS with ${result.provider} in ${responseTime}ms`);

        return Response.json({
          reply: result.reply,
          provider: result.provider,
          responseTime,
          usage: result.usage,
          cached: false,
        });
      } else {
        console.log(`${provider.name} failed:`, result?.error);
      }
    }

    // Dacă toate providerii eșuează
    return new Response(
      JSON.stringify({
        error:
          "Toate serviciile AI gratuite sunt temporar indisponibile. Te rog încearcă din nou în câteva minute.",
        suggestions: [
          "Verifică dacă Ollama rulează local (ollama serve)",
          "Verifică conexiunea la internet pentru Groq",
          "Încearcă cu o întrebare mai scurtă",
        ],
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }
    );
  } catch (err) {
    const responseTime = Date.now() - startTime;
    console.error(`Eroare API (${responseTime}ms):`, err);

    return new Response(
      JSON.stringify({
        error: "A apărut o eroare neașteptată. Te rog încearcă din nou.",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
