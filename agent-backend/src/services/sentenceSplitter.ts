export class SentenceSplitter {
  private buffer = "";
  private onSentence: (sentence: string) => void;

  constructor(onSentence: (sentence: string) => void) {
    this.onSentence = onSentence;
  }

  push(text: string) {
    this.buffer += text;
    this.process();
  }

  flush() {
    const remaining = this.buffer.trim();
    if (remaining) {
      this.onSentence(remaining);
      this.buffer = "";
    }
  }

  private process() {
    let searchStart = 0;
    while (true) {
      const remainingBuffer = this.buffer.substring(searchStart);
      const match = remainingBuffer.match(/[.!?]\s+/);
      if (!match || match.index === undefined) {
        break;
      }

      const matchIdx = searchStart + match.index;
      const endIdx = matchIdx + 1;
      const sentence = this.buffer.substring(0, endIdx).trim();

      if (this.isAbbreviation(sentence)) {
        searchStart = matchIdx + match[0].length;
        continue;
      }

      this.onSentence(sentence);
      this.buffer = this.buffer.substring(matchIdx + match[0].length);
      searchStart = 0;
    }
  }

  private isAbbreviation(text: string): boolean {
    const lastWord = text.split(/\s+/).pop()?.toLowerCase() || "";
    const commonAbbreviations = ["mr.", "mrs.", "dr.", "ms.", "vs.", "eg.", "ie.", "etc.", "approx.", "no."];
    return commonAbbreviations.includes(lastWord);
  }
}
