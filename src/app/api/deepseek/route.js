// Rate limiting și caching pentru optimizare
const MESSAGE_CACHE = new Map();
const RATE_LIMIT = new Map();
const MAX_REQUESTS_PER_MINUTE = 20;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minute
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

// Funcție pentru cache
function getCachedResponse(message) {
  const cached = MESSAGE_CACHE.get(message.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }
  return null;
}

function setCachedResponse(message, response) {
  MESSAGE_CACHE.set(message.toLowerCase(), {
    response,
    timestamp: Date.now(),
  });

  // Curăță cache-ul dacă devine prea mare
  if (MESSAGE_CACHE.size > 100) {
    const oldestKey = MESSAGE_CACHE.keys().next().value;
    MESSAGE_CACHE.delete(oldestKey);
  }
}

export async function POST(req) {
  const startTime = Date.now();

  try {
    // Extrage IP pentru rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : req.headers.get("x-real-ip") || "unknown";

    // Verifică rate limiting
    if (!checkRateLimit(ip)) {
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

    const body = await req.json();
    const { message } = body;

    // Validare input
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({
          error: "Mesajul este obligatoriu și trebuie să fie text.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (message.length > 4000) {
      return new Response(
        JSON.stringify({
          error: "Mesajul este prea lung. Maximum 4000 caractere.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verifică cache pentru mesaje identice
    const cachedResponse = getCachedResponse(message.trim());
    if (cachedResponse) {
      console.log(`Cache hit for message: ${message.substring(0, 50)}...`);
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

    // Timeout pentru request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secunde timeout

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
            "HTTP-Referer":
              process.env.YOUR_SITE_URL || "http://localhost:3000",
            "X-Title": process.env.YOUR_APP_NAME || "SportML Chat",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-r1",
            messages: [
              {
                role: "system",
                content: `Ești SportML Chat, un asistent AI specializat exclusiv în sport.  

📅 Data și ora curentă: ${currentDate}, ${currentTime}  

🎯 Instrucțiuni principale:  
- Răspunde strict la întrebări despre sport (fotbal, tenis, baschet, handbal, sporturi olimpice, performanțe, clasamente, transferuri, statistici etc.).  
- Ignoră orice subiect care nu are legătură cu sportul (ex: școală, politică, economie, divertisment). În astfel de cazuri, răspunde politicos: „Îmi pare rău, dar sunt specializat doar în sport.”  
- Răspunde concis, clar și corect, dar oferă detalii atunci când sunt utile pentru înțelegerea completă.  
- Folosește un ton prietenos și profesionist, potrivit pentru un comentator sau analist sportiv.  
- Dacă informația nu este disponibilă sau actualizată, menționează deschis acest lucru.  
- Pune accent pe date, statistici, performanțe, program de competiții și noutăți sportive.  

⚽ Exemplu de răspunsuri:  
- Întrebare: „Cine e golgheterul Ligii Campionilor acum?”  
  Răspuns: „În acest sezon, golgheterul Ligii Campionilor este [nume jucător] cu [număr] goluri.”  

- Întrebare: „Cine a câștigat ultimul Roland Garros?”  
  Răspuns: „Ultimul Roland Garros a fost câștigat de [nume jucător/jucătoare] în [an], învingându-l/o pe [adversar] în finală.”  `,
              },
              {
                role: "user",
                content: message.trim(),
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

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
        }

        return new Response(JSON.stringify({ error: userMessage }), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        console.error("Răspuns invalid de la API:", data);
        return new Response(
          JSON.stringify({ error: "Răspuns invalid de la serviciul AI." }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      const reply = data.choices[0].message.content.trim();
      const responseTime = Date.now() - startTime;

      // Salvează în cache
      setCachedResponse(message.trim(), reply);

      console.log(`Răspuns generat în ${responseTime}ms`);

      return Response.json({
        reply,
        responseTime,
        usage: data.usage,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error("Request timeout");
        return new Response(
          JSON.stringify({
            error: "Cererea a depășit timpul limită. Te rog încearcă din nou.",
          }),
          { status: 408, headers: { "Content-Type": "application/json" } }
        );
      }

      throw fetchError;
    }
  } catch (err) {
    const responseTime = Date.now() - startTime;
    console.error(`Eroare API (${responseTime}ms):`, err.message);

    return new Response(
      JSON.stringify({
        error: "A apărut o eroare neașteptată. Te rog încearcă din nou.",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
