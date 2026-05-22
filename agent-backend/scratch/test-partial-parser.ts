class SentenceStreamer {
  private buffer = "";
  private onSentence: (sentence: string) => void;

  constructor(onSentence: (sentence: string) => void) {
    this.onSentence = onSentence;
  }

  push(chunk: string) {
    this.buffer += chunk;
    this.process();
  }

  private process() {
    while (true) {
      let index = -1;
      for (let i = 0; i < this.buffer.length; i++) {
        const char = this.buffer[i];
        if (char === "." || char === "!" || char === "?" || char === "\n" || char === "\r") {
          // Check if followed by whitespace or end of string
          if (i === this.buffer.length - 1 || /\s/.test(this.buffer[i + 1])) {
            index = i;
            break;
          }
        }
      }

      if (index === -1) {
        break; // No complete sentence found
      }

      const sentence = this.buffer.substring(0, index + 1).trim();
      if (sentence) {
        this.onSentence(sentence);
      }
      this.buffer = this.buffer.substring(index + 1);
    }
  }

  flush() {
    const remaining = this.buffer.trim();
    if (remaining) {
      this.onSentence(remaining);
    }
    this.buffer = "";
  }
}

function runTest() {
  const sentences: string[] = [];
  const streamer = new SentenceStreamer((s) => sentences.push(s));

  streamer.push("The capital of France is Paris. It");
  streamer.push(" is famous for its history. ");
  streamer.push("Visit the Eiffel Tower! We have 3.5");
  streamer.push(" hours left.");
  streamer.flush();

  console.log("Decoded sentences:");
  console.log(sentences);
}

runTest();
