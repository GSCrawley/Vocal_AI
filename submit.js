const https = require('https');

const data = JSON.stringify({
  branch_name: 'feat/build-0.2-audio-analysis',
  commit_message: 'feat(audio-processor): implement analyze endpoint returning DeepAnalysisResult contract',
  title: 'feat(audio-processor): implement analyze endpoint returning DeepAnalysisResult contract',
  description: 'Implements the POST /analyze endpoint in the Python audio processor per the Build 0.2 milestone. It accepts an audio file or Supabase URL and exercise context, extracting and returning vocal metrics (pitch contour, onset timestamps, RMS envelope, vibrato) formatted precisely to the DeepAnalysisResult shared contract. Includes a deterministic test fixture with a synthesized 440Hz tone and updates the /healthz route check signature to match production expectations. Cleanly formatted with black and fully tested.'
});

const options = {
  hostname: 'localhost',
  port: 1337,
  path: '/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
