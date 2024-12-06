import * as fs from 'fs';

process.stdin.setEncoding('utf-8');
process.stdin.on('data', async (data: string) => {
  data = data.trim();
  if (!data) {
    return;
  }

  let message: { files?: string[] };
  try {
    message = JSON.parse(data);
  } catch (err) {
    process.stdout.write(
      JSON.stringify({ error: 'Invalid JSON input' }) + '\n'
    );
    return;
  }

  if (!message.files || !Array.isArray(message.files)) {
    process.stdout.write(
      JSON.stringify({ error: 'No valid files array provided' }) + '\n'
    );
    return;
  }

  const results: { file: string; content: string | null; error?: string }[] =
    [];
  for (const file of message.files) {
    try {
      const content = await fs.promises.readFile(file, 'utf-8');
      results.push({ file, content });
    } catch (err: any) {
      results.push({ file, content: null, error: err.message });
    }
  }

  process.stdout.write(JSON.stringify({ results }) + '\n');
});
