import fs from 'fs';

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const match = envContent.match(/FAL_KEY=(.*)/);
const FAL_KEY = match ? match[1].trim() : null;

if (!FAL_KEY || FAL_KEY === 'your_actual_api_key_here' || FAL_KEY === '') {
  console.error("Invalid or missing FAL_KEY in .env.local");
  process.exit(1);
}

const prompts = [
  {
    name: "kitchen_fal_landscape",
    size: "landscape_16_9",
    prompt: "Extremely high resolution 8k, razor-sharp focus, incredibly clear, stunning, sunlit modern luxury kitchen. Classic white shaker cabinets, stunning Calcutta marble island. Architectural digest quality, completely photorealistic, macro-lens clarity. A tiny nano banana is visibly sitting on the marble island as a sleek, subtle detail."
  },
  {
    name: "kitchen_fal_portrait",
    size: "portrait_4_3",
    prompt: "Extremely high resolution 8k, gorgeous vertical shot of a premium kitchen sink and high-end brass faucet in a beautiful luxury kitchen. Bright daylight shining through the window. Photorealistic, incredibly sharp. A tiny decorative nano banana is resting gently near the sink."
  },
  {
    name: "kitchen_fal_square",
    size: "square_hd",
    prompt: "Extremely high resolution 8k, spectacular photorealistic luxury kitchen interior in bright daylight. Minimalist Scandinavian design, light oak wood and matte white surfaces, sleek integrated appliances. Premium daylight photography. A very small nano banana rests on a wooden stool."
  }
];

async function generate() {
  for (const p of prompts) {
    console.log(`Generating ${p.name}...`);
    try {
      const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: p.prompt,
          image_size: p.size
        })
      });
      
      const data = await res.json();
      
      if (data && data.images && data.images.length > 0) {
        const imageUrl = data.images[0].url;
        console.log(`Downloading from ${imageUrl}...`);
        
        const imgRes = await fetch(imageUrl);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        
        fs.writeFileSync(`./public/assets/${p.name}.png`, buffer);
        console.log(`Saved ${p.name}.png`);
      } else {
        console.error("No image data returned:", data);
      }
    } catch (e) {
      console.error("Failed to generate", p.name, e);
    }
  }
}

generate();
