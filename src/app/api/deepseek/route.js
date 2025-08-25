async function getF1Data(query) {
  try {
    const response = await fetch("http://ergast.com/api/f1/2025.json");
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching F1 data:", error);
    return null;
  }
}

export async function POST(req) {
  try {
    const { message } = await req.json();
    const API_KEY = process.env.OPENROUTER_API_KEY;

    let contextualInfo = "";

    if (
      message.toLowerCase().includes("f1") ||
      message.toLowerCase().includes("formula") ||
      message.toLowerCase().includes("cursa")
    ) {
      const f1Data = await getF1Data();
      if (f1Data) {
        contextualInfo = `\n\nInformații actualizate despre F1 2025: ${JSON.stringify(
          f1Data.MRData?.RaceTable?.Races || "Nu sunt disponibile date"
        )}`;
      }
    }

    const currentDate = new Date().toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
          "HTTP-Referer": process.env.YOUR_SITE_URL,
          "X-Title": process.env.YOUR_APP_NAME,
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1",
          messages: [
            {
              role: "system",
              content: `Ești un asistent AI util. Data curentă este: ${currentDate}. Suntem în august 2025. Răspunde în română și folosește informațiile actuale când sunt disponibile.${contextualInfo}`,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    return Response.json({ reply });
  } catch (err) {
    console.error("API route error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
