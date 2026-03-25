import fs from 'fs';

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const match = envContent.match(/FAL_KEY=(.*)/);
const FAL_KEY = match ? match[1].trim() : null;

if (!FAL_KEY || FAL_KEY === 'your_actual_api_key_here' || FAL_KEY === '') {
  console.error("Invalid or missing FAL_KEY in .env.local");
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const prompts = [
  {
    name: "exkitchens_flux_geometric",
    ar: "landscape_16_9",
    prompt: "A highly creative, breathtakingly minimalist corporate logo for a luxury brand named 'EXKITCHENS'. Exact text: 'EXKITCHENS'. On the left, a clean, elegant geometric icon consisting of beautiful intersecting circles and minimal shapes in deep forest green and bronze. Creatively integrated into the geometry is a tiny, subtle minimalist yellow nano-banana vector. To the right, the text 'EXKITCHENS' in sophisticated sans-serif typography. Pure white background. Flat vector design, extremely professional."
  }
];

async function generate() {
  for (const p of prompts) {
    console.log(`Generating ${p.name}...`);
    try {
      const res = await fetch("https://queue.fal.run/fal-ai/flux/dev", {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: p.prompt,
          image_size: p.ar,
          output_format: "png"
        })
      });
      
      const submitData = await res.json();
      const requestId = submitData.request_id;
      
      if (!requestId) {
        console.error("Failed to get request ID:", submitData);
        continue;
      }
      
      console.log(`Job submitted. Request ID: ${requestId}`);
      
      let isComplete = false;
      while (!isComplete) {
        await sleep(2000);
        const statusRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/requests/${requestId}/status`, {
          method: "GET",
          headers: {
            "Authorization": `Key ${FAL_KEY}`
          }
        });
        const statusData = await statusRes.json();
        
        if (statusData.status === 'COMPLETED') {
          isComplete = true;
          console.log(`Job ${requestId} completed!`);
        } else if (statusData.status === 'IN_PROGRESS' || statusData.status === 'IN_QUEUE') {
          console.log(`Status: ${statusData.status}...`);
        } else {
          console.error("Job failed or unknown status:", statusData);
          break;
        }
      }
      
      if (isComplete) {
        const resultRes = await fetch(`https://queue.fal.run/fal-ai/flux/dev/requests/${requestId}`, {
          method: "GET",
          headers: {
            "Authorization": `Key ${FAL_KEY}`
          }
        });
        const resultData = await resultRes.json();
        
        if (resultData && resultData.images && resultData.images.length > 0) {
          const imageUrl = resultData.images[0].url;
          console.log(`Downloading from ${imageUrl}...`);
          
          const imgRes = await fetch(imageUrl);
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          
          fs.writeFileSync(`./public/assets/${p.name}.png`, buffer);
          console.log(`Saved ${p.name}.png`);
        }
      }
      
    } catch (e) {
      console.error("Failed to generate", p.name, e);
    }
  }
}

generate();
