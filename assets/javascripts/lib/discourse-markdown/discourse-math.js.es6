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

let inlineMath = (startDelimiter, endDelimiter) => (state, silent) => {
  // DH Hack for now
  // TODO: support multiple-char delimiters
  let delimiter_code = startDelimiter.charCodeAt(0);
  let end_delimiter_code = endDelimiter.charCodeAt(0);
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
  if (state.src.charCodeAt(pos + 1) === end_delimiter_code) {
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
    if (code === end_delimiter_code && state.src.charCodeAt(i - 1) !== 92 /* \ */) {
      found = i;
      break;
    }
  }

  if (!found) {
    return false;
  }

  if (found + 1 <= posMax) {
    let next = state.src.charCodeAt(found + 1);
    if (next && !isSafeBoundary(next, end_delimiter_code, state.md)) {
      return false;
    }
  }

  let data = state.src.slice(pos + 1, found);
  let token = state.push("html_raw", "", 0);

  const escaped = state.md.utils.escapeHtml(data);
  let math_class = startDelimiter === endDelimiter === '%' ? "'asciimath'" : "'math'";
  token.content = `<span class=${math_class}>${escaped}</span>`;
  state.pos = found + 1;
  return true;
}

function isBlockMarker(state, start, max, md, blockMarker) {

  if (!state.src.startsWith(blockMarker, start)) {
    return false;
  }
  
  // ensure we only have spaces and newlines after block math marker
  for (let i = start + blockMarker.length; i < max; i++) {
    if (!md.utils.isSpace(state.src.charCodeAt(i))) {
      return false;
    }
  }

  return true;
}

let blockMath = (startBlockMathMarker, endBlockMathMarker) => (state, startLine, endLine, silent) => {
  let start = state.bMarks[startLine] + state.tShift[startLine],
    max = state.eMarks[startLine];

  let startBlockMarker = startBlockMathMarker;
  let endBlockMarker = endBlockMathMarker;

  // Special processing for /\begin{[a-z]+}/
  if (startBlockMarker instanceof RegExp) {
    let substr = state.src.substring(start, max);
    let match = substr.match(startBlockMarker);
    if(!match) {
      return false;
    }
    let mathEnv = match[1];
    startBlockMarker = `\\begin{${mathEnv}}`;
    endBlockMarker = `\\end{${mathEnv}}`;
  }

  if (!isBlockMarker(state, start, max, state.md, startBlockMarker)) {
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
        endBlockMarker
      )
    ) {
      closed = true;
      break;
    }
  }

  let token = state.push("html_raw", "", 0);

  // Math environment blockmarkers '\begin{}' and '\end{}'
  // needs to be passed to the TeX engine
  let endContent = endBlockMarker.startsWith('\\end{') || !closed ?
      state.eMarks[nextLine] : state.eMarks[nextLine - 1];

  let startContent = startBlockMarker.startsWith('\\begin{') ?
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

  let enableAsciiMath, enableMathEnvs;
  let inlineDelimiters, blockDelimiters;
  helper.registerOptions((opts, siteSettings) => {
    opts.features.math = siteSettings.discourse_math_enabled;
    enableAsciiMath = siteSettings.discourse_math_enable_asciimath;
    enableMathEnvs = siteSettings.discourse_math_process_tex_environments;
    inlineDelimiters = siteSettings.discourse_math_inline_delimiters;
    blockDelimiters = siteSettings.discourse_math_block_delimiters;
  });

  helper.registerPlugin(md => {
    if (enableAsciiMath) {
      md.inline.ruler.after("escape", "asciimath", inlineMath('%', '%'));
    }

    if (enableMathEnvs) {
        md.block.ruler.after("code", "math",
          blockMath(/\\begin\{([a-z]+)\}/, /\\end\{([a-z]+)\}/), {
          alt: ["paragraph", "reference", "blockquote", "list"]
        });
    }
    // Helper function for checking input
    const isEmptyStr = elem => elem.trim() === '';

    inlineDelimiters.split('|').forEach(d => {
        let delims = d.split(',');
        if (delims.length !== 2 || delims.some(isEmptyStr)) {
          console.error('Invalid input in discourse_math_inline_delimiters!');
          return;
        }
        let startDelim = delims[0].trim();
        let endDelim = delims[1].trim();
        md.inline.ruler.after("escape", "math", inlineMath(startDelim, endDelim));
    });

    blockDelimiters.split('|').forEach(d => {
        let delims = d.split(',');
        if (delims.length !== 2 || delims.some(isEmptyStr)) {
          console.error('Invalid input in discourse_math_block_delimiters!');
          return;
        }
        let startDelim = delims[0].trim();
        let endDelim = delims[1].trim();
        md.block.ruler.after("code", "math", blockMath(startDelim, endDelim), {
          alt: ["paragraph", "reference", "blockquote", "list"]
        });
    });
  });
}
