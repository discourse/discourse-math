// inspired by https://github.com/classeur/markdown-it-mathjax/blob/master/markdown-it-mathjax.js
//
//
//

function isSafeBoundary(character, delimiter) {

  let characterCode = character.charCodeAt(0);
  // 0-9
  if (characterCode > 47 && characterCode < 58) {
    return false;
  }

  // Need to distinguish $ from $$
  if (delimiter.length == 1 && delimiter.charCodeAt(0) === characterCode) {
    return false;
  }

  return true;
}

let inlineMath = (startDelimiter, endDelimiter) => (state, silent) => {
  let pos = state.pos,
    posMax = state.posMax;

  if (
    silent ||
    !state.src.startsWith(startDelimiter, pos) ||
    posMax < pos + startDelimiter.length + endDelimiter.length
  ) {
    return false;
  }

  // too short
  if (state.src.startsWith(endDelimiter, pos + startDelimiter.length)) {
    return false;
  }

  if (pos > 0) {
    let prev = state.src[pos - 1];
    if (!isSafeBoundary(prev, startDelimiter)) {
      return false;
    }
  }

  let found;
  if (endDelimiter.length === 1) {
    // Faster iterations, comparing numbers instead of characters
    // and respecting character escaping with `\`
    let endDelimCode = endDelimiter.charCodeAt(0);
    for (let i = pos + 1; i < posMax; i++) {
      let code = state.src.charCodeAt(i);
      if (code === endDelimCode && state.src.charCodeAt(i - 1) !== 92 /* \ */) {
        found = i;
        break;
      }
    }
  } else {
    for (let i = pos + 1; i <= posMax - endDelimiter.length; i++) {
      // we do not respect escaping here because we need to allow for
      // \(...\) TeX inline delimiters
      if (state.src.startsWith(endDelimiter, i)) {
        found = i;
        break;
      }
    }
  }

  if (!found) {
    return false;
  }

  if (found + endDelimiter.length <= posMax) {
    let next = state.src[found + endDelimiter.length];
    if (!isSafeBoundary(next, endDelimiter)) {
      return false;
    }
  }

  let data = state.src.slice(pos + startDelimiter.length, found);
  let token = state.push("html_raw", "", 0);

  const escaped = state.md.utils.escapeHtml(data);
  let math_class = startDelimiter === endDelimiter === '%' ? "'asciimath'" : "'math'";
  token.content = `<span class=${math_class}>${escaped}</span>`;
  state.pos = found + endDelimiter.length;
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

  // Special processing for /\begin{([a-z]+)}/
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
  let texRenderer;
  helper.registerOptions((opts, siteSettings) => {
    opts.features.math = siteSettings.discourse_math_enabled;
    enableAsciiMath = siteSettings.discourse_math_enable_asciimath;
    enableMathEnvs = siteSettings.discourse_math_process_tex_environments;
    inlineDelimiters = siteSettings.discourse_math_inline_delimiters;
    blockDelimiters = siteSettings.discourse_math_block_delimiters;
    texRenderer = siteSettings.discourse_math_provider;
  });

  helper.registerPlugin(md => {
    let mathjax = texRenderer === 'mathjax';
    if (enableAsciiMath && mathjax) {
      md.inline.ruler.after("escape", "asciimath", inlineMath('%', '%'));
    }

    if (enableMathEnvs && mathjax) {
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
        md.inline.ruler.before("escape", "math", inlineMath(startDelim, endDelim));
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
