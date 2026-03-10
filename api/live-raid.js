export default async function handler(req, res) {

  try {

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    const credentials = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

    const tokenResponse = await fetch(
      "https://www.warcraftlogs.com/oauth/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const reportsQuery = `
      {
        reportData {
          reports(
            guildName: "We Pull at Two",
            guildServerSlug: "blackrock",
            guildServerRegion: "eu",
            limit: 1
          ) {
            data {
              code
              startTime
            }
          }
        }
      }
    `;

    const reportsResponse = await fetch(
      "https://www.warcraftlogs.com/api/v2/client",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: reportsQuery })
      }
    );

    const reportsData = await reportsResponse.json();
    const report = reportsData?.data?.reportData?.reports?.data?.[0];

    if (!report) {
      return res.status(200).json({ live:false });
    }

    const reportCode = report.code;
    const reportStart = report.startTime;

    const fightsQuery = `
      {
        reportData {
          report(code: "${reportCode}") {
            fights {
              name
              zoneID
              bossPercentage
              kill
              difficulty
              startTime
            }
          }
        }
      }
    `;

    const fightsResponse = await fetch(
      "https://www.warcraftlogs.com/api/v2/client",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: fightsQuery })
      }
    );

    const fightsData = await fightsResponse.json();
    const fights = fightsData?.data?.reportData?.report?.fights || [];

    const pulls = fights.filter(f => f.bossPercentage !== null);

    if (pulls.length === 0) {
      return res.status(200).json({ live:false });
    }

    const firstPull = pulls[0];
    const firstPullTime = reportStart + firstPull.startTime;

    const lastPull = pulls[pulls.length - 1];
    const lastPullTime = reportStart + lastPull.startTime;

    const now = Date.now();

    const minutesSinceLastPull =
      (now - lastPullTime) / 1000 / 60;

    const raidStillActive = minutesSinceLastPull < 15;

    const summaryActive =
      minutesSinceLastPull >= 15 &&
      minutesSinceLastPull < 360;

    const currentBoss = lastPull.name;

    const difficultyMap = {
      3: "Normal",
      4: "Heroic",
      5: "Mythic"
    };

    const difficulty =
      difficultyMap[lastPull.difficulty] || "";

    const bossPulls = pulls.filter(p =>
      p.name === currentBoss &&
      p.difficulty === lastPull.difficulty
    );

    const totalPulls = bossPulls.length;

    let best = 100;
    const timeline = [];

    bossPulls.forEach((pull,index)=>{

      let percent = pull.kill ? 0 : pull.bossPercentage;

      if(percent < best){

        best = percent;

        timeline.push({
          pull:index + 1,
          percent:percent.toFixed(2)
        });

      }

    });

    let raidDurationMs;

    if(raidStillActive){
      raidDurationMs = now - firstPullTime;
    }else{
      raidDurationMs = lastPullTime - firstPullTime;
    }

    const hours =
      Math.floor(raidDurationMs / (1000 * 60 * 60));

    const minutes =
      Math.floor(
        (raidDurationMs % (1000 * 60 * 60))
        / (1000 * 60)
      );

    const raidDuration = `${hours}h ${minutes}m`;

    /* ===========================
       RAID NAMES
    =========================== */

    const raidNameMap = {
      37: "The Dreamrift",
      38: "The Voidspire",
      39: "March on Quel'Danas"
    };

    /* ===========================
       RAID SUMMARY BERECHNEN
    =========================== */

    const raidStats = {};

    fights.forEach(fight => {

      const raidName =
        raidNameMap[fight.zoneID] || "Raid";

      const diff =
        difficultyMap[fight.difficulty] || "Unknown";

      if(!raidStats[raidName])
        raidStats[raidName] = {};

      if(!raidStats[raidName][diff])
        raidStats[raidName][diff] = {
          kills:0,
          pulls:0
        };

      if(fight.bossPercentage !== null)
        raidStats[raidName][diff].pulls++;

      if(fight.kill)
        raidStats[raidName][diff].kills++;

    });

    /* ===========================
       PROGRESS PRO DIFFICULTY
    =========================== */

    const bossCount = {
      "Normal": 8,
      "Heroic": 8,
      "Mythic": 8
    };

    Object.keys(raidStats).forEach(raid => {

      Object.keys(raidStats[raid]).forEach(diff => {

        const kills = raidStats[raid][diff].kills;
        const total = bossCount[diff] || "?";

        raidStats[raid][diff].progress =
          `${kills} / ${total} Bosse`;

      });

    });

    /* ===========================
       LIVE RAID
    =========================== */

    if(raidStillActive){

      return res.status(200).json({

        live:true,
        boss:currentBoss,
        difficulty:difficulty,
        report:reportCode,
        raidDuration:raidDuration,
        totalPulls:totalPulls,
        bestPull:best.toFixed(2),
        kill:lastPull.kill || false,
        timeline:timeline

      });

    }

    /* ===========================
       RAID SUMMARY
    =========================== */

    if(summaryActive){

      return res.status(200).json({

        live:false,
        summary:true,
        raidDuration:raidDuration,
        report:reportCode,
        raidStats:raidStats

      });

    }

    return res.status(200).json({
      live:false
    });

  }

  catch(error){

    res.status(500).json({
      error:error.message
    });

  }

}
