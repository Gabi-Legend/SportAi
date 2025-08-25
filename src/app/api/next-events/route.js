export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId") || "4328";

  const url = `https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=${leagueId}`;
  const resp = await fetch(url, { cache: "no-store" });
  const data = await resp.json();

  const events = (data?.events || []).slice(0, 5).map((e) => ({
    event: e.strEvent,
    date: e.dateEvent,
    time: e.strTime,
    league: e.strLeague,
  }));

  return Response.json({ events });
}
