// inspired by https://github.com/classeur/markdown-it-mathjax/blob/master/markdown-it-mathjax.js
//
//
//

function isSafeBoundary(character_code, delimiter_code, md) {
  if (character_code === delimiter_code) {
    return false;
  }

  if (md.utils.isWhiteSpace(character_code)) {
    return true;
  }

  if (md.utils.isMdAsciiPunct(character_code)) {
    return true;
  }

  if (md.utils.isPunctChar(character_code)) {
    return true;
  }

  return false;
}

let inlineMath = delimiter => (state, silent) => {
  let delimiter_code = delimiter.charCodeAt(0);
  let pos = state.pos,
    posMax = state.posMax;

  if (
    silent ||
    state.src.charCodeAt(pos) !== delimiter_code ||
    posMax < pos + 2
  ) {
    return false;
  }

  // too short
  if (state.src.charCodeAt(pos + 1) === delimiter_code) {
    return false;
  }

  if (pos > 0) {
    let prev = state.src.charCodeAt(pos - 1);
    if (!isSafeBoundary(prev, delimiter_code, state.md)) {
      return false;
    }
  }

  let found;
  for (let i = pos + 1; i < posMax; i++) {
    let code = state.src.charCodeAt(i);
    if (code === delimiter_code && state.src.charCodeAt(i - 1) !== 92 /* \ */) {
      found = i;
      break;
    }
  }

  if (!found) {
    return false;
  }

  if (found + 1 <= posMax) {
    let next = state.src.charCodeAt(found + 1);
    if (next && !isSafeBoundary(next, delimiter_code, state.md)) {
      return false;
    }
  }

  let data = state.src.slice(pos + 1, found);
  let token = state.push("html_raw", "", 0);

  const escaped = state.md.utils.escapeHtml(data);
  let math_class = delimiter_code === 37 /* % */ ? "'asciimath'" : "'math'";
  token.content = `<span class=${math_class}>${escaped}</span>`;
  state.pos = found + 1;
  return true;
}

function isBlockMarker(state, start, max, md, blockMarker) {

  if (!state.src.startsWith(blockMarker, start)) {
    return false;
  }

  // ensure we only have spaces and newline after blockmarker
  for (let i = start + blockMarker.length; i < max; i++) {
    if (!md.utils.isSpace(state.src.charCodeAt(i))) {
      return false;
    }
  }

  return true;
}

let blockMath = blockMarker => (state, startLine, endLine, silent) => {
  let start = state.bMarks[startLine] + state.tShift[startLine],
    max = state.eMarks[startLine];

  if (!isBlockMarker(state, start, max, state.md, blockMarker)) {
    return false;
  }

  if (silent) {
    return true;
  }

  let nextLine = startLine;
  let closed = false;
  for (;;) {
    nextLine++;

    // Unclosed blockmarker is considered math
    if (nextLine >= endLine) {
      break;
    }

    if (
      isBlockMarker(
        state,
        state.bMarks[nextLine] + state.tShift[nextLine],
        state.eMarks[nextLine],
        state.md,
        blockMarker.replace('\\begin{', '\\end{')
      )
    ) {
      closed = true;
      break;
    }
  }

  let token = state.push("html_raw", "", 0);

  // Blockmarker starting with \begin{ end ending with '\end{'
  // needs to be passed to the TeX engine
  let endContent = blockMarker.startsWith('\\begin{') || !closed ?
      state.eMarks[nextLine] : state.eMarks[nextLine - 1];

  let startContent = blockMarker.startsWith('\\begin{') ?
      state.bMarks[startLine] : state.bMarks[startLine + 1] + state.tShift[startLine + 1];

  let content = state.src.slice(startContent, endContent);

  const escaped = state.md.utils.escapeHtml(content);
  token.content = `<div class='math'>\n${escaped}\n</div>\n`;

  state.line = closed ? nextLine + 1 : nextLine;

  return true;
}

export function setup(helper) {
  if (!helper.markdownIt) {
    return;
  }

  let enable_asciimath;
  let inlineDelimiters, blockDelimiters;
  helper.registerOptions((opts, siteSettings) => {
    opts.features.math = siteSettings.discourse_math_enabled;
    enable_asciimath = siteSettings.discourse_math_enable_asciimath;
    inlineDelimiters = siteSettings.discourse_math_inline_delimiters;
    blockDelimiters = siteSettings.discourse_math_block_delimiters;
  });

  helper.registerPlugin(md => {
    if (enable_asciimath) {
      md.inline.ruler.after("escape", "asciimath", inlineMath('%'));
    }
    if (inlineDelimiters) {
      inlineDelimiters.split('|').forEach(delim => {
        // We expect only one character
        // for inline math delimiter
        let d = delim.trim();
        if (d.length !== 1) return;
        md.inline.ruler.after("escape", "math", inlineMath(d));
      });
    }
    if (blockDelimiters) {
      blockDelimiters.split('|').forEach(delim => {
        let d = delim.trim();
        md.block.ruler.after("code", "math", blockMath(delim), {
          alt: ["paragraph", "reference", "blockquote", "list"]
        });
      });
    }
  });
}
