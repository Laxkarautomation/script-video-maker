async function generateVideo(){
  const script=document.getElementById("script").value.trim();
  const status=document.getElementById("status");
  const video=document.getElementById("video");

  if(!script){
    status.innerText="Script paste karo";
    return;
  }

  status.innerText="Video ban raha hai...";
  video.style.display="none";

  const res=await fetch("/generate",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({script})
  });

  const data=await res.json();

  if(!data.success){
    status.innerText="Error: "+data.error;
    return;
  }

  status.innerText="Video ready!";
  video.src=data.video;
  video.style.display="block";
}
