async function loadRaidTracker(){

  const res = await fetch("/api/live-raid");
  const data = await res.json();

  const container = document.getElementById("raid-tracker");

  if(!data.boss){
    container.innerHTML = `
      <div class="raid-card">
        🔴 Aktuell kein Live Raid
      </div>
    `;
    return;
  }

  let timelineHTML = "";

  data.timeline.forEach((p,i)=>{

    const star = (i === data.timeline.length-1) ? " ⭐" : "";

    timelineHTML += `
      <div class="pull-row">
        Pull ${p.pull} → ${p.percent}%${star}
      </div>
    `;

  });

  container.innerHTML = `
    <div class="raid-card">

      <div class="raid-live">
        🟢 LIVE RAID
      </div>

      <div class="raid-boss">
        ${data.boss}
      </div>

      <div class="raid-stats">
        Pulls: ${data.totalPulls}
      </div>

      <div class="raid-stats">
        Best Pull: ${data.bestPull}%
      </div>

      <div class="raid-timeline">
        ${timelineHTML}
      </div>

      <a class="raid-log" href="https://www.warcraftlogs.com/reports/${data.report}" target="_blank">
        WarcraftLogs öffnen
      </a>

    </div>
  `;

}

loadRaidTracker();

// alle 30 Sekunden aktualisieren
setInterval(loadRaidTracker,30000);
