async function loadRaid(){

const container = document.getElementById("raid-status");

try{

const res = await fetch("/api/live-raid");
const data = await res.json();

if(!data.active){

container.innerHTML = `
Next Raid Monitor<br><br>
Raid aktuell nicht aktiv
`;

return;
}

container.innerHTML = `

<div class="live">🔴 LIVE RAID</div>

<h3>${data.boss}</h3>

Pulls: ${data.pulls}<br>
Best Pull: ${data.best}%


<div class="progress-bar">
<div class="progress-fill" style="width:${data.best}%"></div>
</div>

<br>

Raid Zeit: ${data.time}

<br><br>

<a href="${data.log}" target="_blank">
<button>WarcraftLogs öffnen</button>
</a>

`;

}catch{

container.innerHTML="Raid Status nicht verfügbar";

}

}

loadRaid();
setInterval(loadRaid,60000);
