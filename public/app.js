async function generateVideo(){
  const script=document.getElementById("script").value.trim();
  const status=document.getElementById("status");
  const video=document.getElementById("video");
  const download=document.getElementById("download");

  if(!script){
    status.innerText="Script paste karo";
    return;
  }

  status.innerText="Video ban raha hai... terminal logs check karo";
  video.style.display="none";
  download.style.display="none";

  const res=await fetch("/api/generate",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({script})
  });

  const data=await res.json();

  if(!data.success){
    status.innerText="Error: "+data.error;
    return;
  }

  const videoUrl=data.videoUrl+"?t="+Date.now();

  status.innerText="Video ready! Job ID: "+data.jobId;
  video.src=videoUrl;
  video.style.display="block";

  download.href=data.downloadUrl+"?download="+Date.now();
  download.innerText="Download MP4";
  download.style.display="inline-block";
}
