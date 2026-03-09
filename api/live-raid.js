export default async function handler(req, res) {

  res.status(200).json({
    active: true,
    boss: "The Dreamrift – Heroic",
    pulls: 37,
    best: 12,
    time: "2h 14m",
    log: "https://www.warcraftlogs.com"
  });

}
