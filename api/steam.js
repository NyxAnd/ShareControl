// ═══ STEAM API PROXY ENDPOINT ═══
// This endpoint proxies Steam API calls to avoid CORS issues

const STEAM_API_KEY = process.env.STEAM_API_KEY || '1F68969564AA1DBBDC29CCDCA84C8AAF'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { endpoint, steamid } = req.query

    if (!endpoint || !steamid) {
      return res.status(400).json({ error: 'Missing endpoint or steamid' })
    }

    let steamUrl = ''

    switch (endpoint) {
      case 'GetPlayerSummaries':
        steamUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamid}`
        break
      case 'GetOwnedGames':
        steamUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&include_appinfo=true&include_played_free_games=true`
        break
      case 'GetRecentlyPlayedGames':
        steamUrl = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&count=10`
        break
      default:
        return res.status(400).json({ error: 'Unknown endpoint' })
    }

    const steamRes = await fetch(steamUrl)
    const data = await steamRes.json()

    return res.status(200).json(data)
  } catch (error) {
    console.error('Steam API Proxy Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
