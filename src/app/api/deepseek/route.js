// Rate limiting și caching pentru optimizare - VERSIUNE ÎMBUNĂTĂȚITĂ
const MESSAGE_CACHE = new Map();
const RATE_LIMIT = new Map();
const MAX_REQUESTS_PER_MINUTE = 15; // Redus pentru a preveni suprasolicitarea
const CACHE_DURATION = 10 * 60 * 1000; // 10 minute - cache mai lung
const REQUEST_TIMEOUT = 25000; // 25 secunde - timeout mai conservator
const MAX_RETRIES = 2; // Retry logic pentru erori temporare

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = RATE_LIMIT.get(ip) || [];

  // Curăță request-urile mai vechi de 1 minut
  const recentRequests = userRequests.filter((time) => now - time < 60000);

  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  recentRequests.push(now);
  RATE_LIMIT.set(ip, recentRequests);
  return true;
}

// Funcție pentru cache - îmbunătățită
function getCachedResponse(message) {
  const normalizedMessage = message.toLowerCase().trim();
  const cached = MESSAGE_CACHE.get(normalizedMessage);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Șterge cache-ul expirat
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

  // Curăță cache-ul mai agresiv pentru a evita memory leaks
  if (MESSAGE_CACHE.size > 50) {
    // Șterge cele mai vechi 10 intrări
    const entries = Array.from(MESSAGE_CACHE.entries());
    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 10)
      .forEach(([key]) => MESSAGE_CACHE.delete(key));
  }
}

// Funcție pentru retry cu exponential backoff
async function makeRequestWithRetry(requestConfig, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(requestConfig.url, {
        ...requestConfig.options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Dacă răspunsul este 502, 503, 504 sau 429, încearcă din nou
      if (attempt < retries && [502, 503, 504, 429].includes(response.status)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 secunde
        console.log(
          `Attempt ${attempt + 1} failed with ${
            response.status
          }, retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt === retries) {
        throw error;
      }

      // Dacă este timeout sau network error, încearcă din nou
      if (error.name === "AbortError" || error.message.includes("fetch")) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000);
        console.log(
          `Attempt ${attempt + 1} failed with ${
            error.name
          }, retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}

export async function POST(req) {
  const startTime = Date.now();

  try {
    // Extrage IP pentru rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : req.headers.get("x-real-ip") ||
        req.headers.get("cf-connecting-ip") || // Cloudflare
        "unknown";

    // Verifică rate limiting mai strict
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
            "Cache-Control": "no-cache",
          },
        }
      );
    }

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

    // Validare input îmbunătățită
    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(
        JSON.stringify({
          error: "Mesajul este obligatoriu și trebuie să conțină text valid.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length > 3000) {
      // Redus pentru a evita token limits
      return new Response(
        JSON.stringify({
          error: "Mesajul este prea lung. Maximum 3000 caractere.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verifică cache pentru mesaje identice
    const cachedResponse = getCachedResponse(trimmedMessage);
    if (cachedResponse) {
      console.log(
        `Cache hit for message: ${trimmedMessage.substring(0, 50)}...`
      );
      return Response.json({
        reply: cachedResponse,
        cached: true,
        responseTime: Date.now() - startTime,
      });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY) {
      console.error("OPENROUTER_API_KEY nu este configurată");
      return new Response(
        JSON.stringify({ error: "Configurația serverului este incompletă." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const currentDate = new Date().toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const currentTime = new Date().toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Payload optimizat pentru a reduce dimensiunea
    const requestPayload = {
      model: "deepseek/deepseek-r1",
      messages: [
        {
          role: "system",
          content: `Ești SportML Chat, asistent AI specializat exclusiv în sport.

📅 ${currentDate}, ${currentTime}

🎯 Reguli:
- Răspunde DOAR la întrebări despre sport (fotbal, tenis, baschet, handbal, sporturi olimpice, performanțe, clasamente, transferuri, statistici).
- Pentru alte subiecte: "Îmi pare rău, sunt specializat doar în sport."
- Răspunsuri concise și clare, fără formatare specială (*, /, !).
- Ton prietenos și profesionist.
- Dacă informația nu e disponibilă, menționează acest lucru.

⚽ Concentrează-te pe: date, statistici, performanțe, competiții, noutăți sportive.`,
        },
        {
          role: "user",
          content: trimmedMessage,
        },
      ],
      temperature: 0.6, // Redus pentru consistență
      max_tokens: 800, // Redus pentru a evita timeout-urile
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      stream: false, // Asigură-te că nu folosești streaming
    };

    try {
      const response = await makeRequestWithRetry({
        url: "https://openrouter.ai/api/v1/chat/completions",
        options: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
            "HTTP-Referer":
              process.env.YOUR_SITE_URL || "http://localhost:3000",
            "X-Title": process.env.YOUR_APP_NAME || "SportML Chat",
            "User-Agent": "SportML-Chat/1.0",
          },
          body: JSON.stringify(requestPayload),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API error [${response.status}]:`, errorText);

        let userMessage = "A apărut o eroare la procesarea cererii.";
        if (response.status === 401) {
          userMessage =
            "Problemă de autentificare. Te rog contactează administratorul.";
        } else if (response.status === 429) {
          userMessage =
            "Serviciul este temporar suprasolicitat. Te rog încearcă în câteva momente.";
        } else if (response.status >= 500) {
          userMessage =
            "Serviciul este temporar indisponibil. Te rog încearcă din nou.";
        } else if (response.status === 400) {
          userMessage =
            "Cererea nu a putut fi procesată. Te rog reformulează întrebarea.";
        }

        return new Response(JSON.stringify({ error: userMessage }), {
          status: response.status === 502 ? 503 : response.status, // Convertește 502 în 503
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "30",
          },
        });
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Eroare parsing JSON:", jsonError);
        return new Response(
          JSON.stringify({ error: "Răspuns invalid de la serviciul AI." }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!data.choices?.[0]?.message?.content) {
        console.error("Răspuns invalid de la API:", data);
        return new Response(
          JSON.stringify({ error: "Răspuns invalid de la serviciul AI." }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      const reply = data.choices[0].message.content.trim();
      const responseTime = Date.now() - startTime;

      // Validează răspunsul înainte de cache
      if (reply && reply.length > 0) {
        setCachedResponse(trimmedMessage, reply);
      }

      console.log(
        `Răspuns generat în ${responseTime}ms pentru IP: ${ip.substring(
          0,
          8
        )}...`
      );

      return Response.json({
        reply,
        responseTime,
        usage: data.usage,
        model: "deepseek/deepseek-r1",
      });
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);

      if (fetchError.name === "AbortError") {
        return new Response(
          JSON.stringify({
            error:
              "Cererea a depășit timpul limită. Te rog încearcă din nou cu o întrebare mai scurtă.",
          }),
          { status: 408, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error:
            "Probleme de conectare cu serviciul AI. Te rog încearcă din nou.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "30",
          },
        }
      );
    }
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
          "Cache-Control": "no-cache",
        },
      }
    );
  }
}
