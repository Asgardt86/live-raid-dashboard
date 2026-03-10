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
        method:"POST",
        headers:{
          Authorization:`Basic ${credentials}`,
          "Content-Type":"application/x-www-form-urlencoded"
        },
        body:"grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    /* =====================
       LETZTE REPORTS LADEN
    ===================== */

    const reportsQuery = `
      {
        reportData {
          reports(
            guildName: "We Pull at Two",
            guildServerSlug: "blackrock",
            guildServerRegion: "eu",
            limit: 5
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
        method:"POST",
        headers:{
          Authorization:`Bearer ${accessToken}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({query:reportsQuery})
      }
    );

    const reportsData = await reportsResponse.json();

    const reports =
      reportsData?.data?.reportData?.reports?.data || [];

    if(reports.length === 0){
      return res.status(200).json({live:false});
    }

    let activeReport = null;
    let fights = [];
    let reportStart = 0;

    /* =====================
       AKTIVEN LOG SUCHEN
    ===================== */

    for(const report of reports){

      const fightsQuery = `
      {
        reportData {
          report(code:"${report.code}") {
            fights {
              name
              bossPercentage
              kill
              difficulty
              startTime
            }
          }
        }
      }`;

      const fightsResponse = await fetch(
        "https://www.warcraftlogs.com/api/v2/client",
        {
          method:"POST",
          headers:{
            Authorization:`Bearer ${accessToken}`,
            "Content-Type":"application/json"
          },
          body:JSON.stringify({query:fightsQuery})
        }
      );

      const fightsData = await fightsResponse.json();

      const pulls =
        fightsData?.data?.reportData?.report?.fights
        ?.filter(f=>f.bossPercentage!==null) || [];

      if(pulls.length === 0) continue;

      const lastPull = pulls[pulls.length-1];

      const lastPullTime =
        report.startTime + (lastPull.startTime||0);

      const minutesSincePull =
        (Date.now() - lastPullTime) / 1000 / 60;

      if(minutesSincePull < 25){

        activeReport = report;
        fights = pulls;
        reportStart = report.startTime;
        break;

      }

      if(!activeReport){

        activeReport = report;
        fights = pulls;
        reportStart = report.startTime;

      }

    }

    if(!activeReport){
      return res.status(200).json({live:false});
    }

    const lastPull = fights[fights.length-1];
    const firstPull = fights[0];

    const now = Date.now();

    const firstPullTime =
      reportStart + (firstPull.startTime||0);

    const lastPullTime =
      reportStart + (lastPull.startTime||0);

    const minutesSincePull =
      (now-lastPullTime)/1000/60;

    const raidStillActive = minutesSincePull < 25;

    const reportAgeMinutes =
      (now-reportStart)/1000/60;

    const summaryActive =
      !raidStillActive && reportAgeMinutes < 360;

    /* =====================
       DIFFICULTY
    ===================== */

    const difficultyMap={
      3:"Normal",
      4:"Heroic",
      5:"Mythic"
    };

    const difficulty =
      difficultyMap[lastPull.difficulty]||"";

    const currentBoss = lastPull.name;

    /* =====================
       BOSS PULLS
    ===================== */

    const bossPulls = fights.filter(
      p=>p.name===currentBoss &&
      p.difficulty===lastPull.difficulty
    );

    const totalPulls = bossPulls.length;

    let best=100;
    const timeline=[];

    bossPulls.forEach((pull,index)=>{

      const percent =
        pull.kill ? 0 : pull.bossPercentage;

      if(percent < best){

        best = percent;

        timeline.push({
          pull:index+1,
          percent:percent.toFixed(2)
        });

      }

    });

    /* =====================
       RAID DAUER
    ===================== */

    const raidDurationMs =
      raidStillActive
      ? now-firstPullTime
      : lastPullTime-firstPullTime;

    const hours =
      Math.floor(raidDurationMs/3600000);

    const minutes =
      Math.floor((raidDurationMs%3600000)/60000);

    const raidDuration=`${hours}h ${minutes}m`;

    /* =====================
       RAID SUMMARY
    ===================== */

    const raidStats={};

    fights.forEach(f=>{

      if(f.bossPercentage===null && !f.kill)
        return;

      const diff =
        difficultyMap[f.difficulty]||"Unknown";

      if(!raidStats[diff])
        raidStats[diff]={kills:0,pulls:0};

      if(f.bossPercentage!==null)
        raidStats[diff].pulls++;

      if(f.kill)
        raidStats[diff].kills++;

    });

    /* =====================
       LIVE RAID
    ===================== */

    if(raidStillActive){

      return res.status(200).json({

        live:true,
        boss:currentBoss,
        difficulty:difficulty,
        report:activeReport.code,
        raidDuration:raidDuration,
        totalPulls:totalPulls,
        bestPull:best.toFixed(2),
        kill:lastPull.kill||false,
        timeline:timeline

      });

    }

    /* =====================
       RAID SUMMARY
    ===================== */

    if(summaryActive){

      return res.status(200).json({

        live:false,
        summary:true,
        raidDuration:raidDuration,
        report:activeReport.code,
        raidStats:raidStats

      });

    }

    return res.status(200).json({live:false});

  }

  catch(error){

    res.status(500).json({error:error.message});

  }

}
