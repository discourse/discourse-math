// inspired by https://github.com/classeur/markdown-it-mathjax/blob/master/markdown-it-mathjax.js
//
//
//
function isSafeBoundary(code, md) {
  if (code === 36) {
    return false;
  }

  if (md.utils.isWhiteSpace(code)) {
    return true;
  }

  if (md.utils.isMdAsciiPunct(code)) {
    return true;
  }

  if (md.utils.isPunctChar(code)) {
    return true;
  }

  return false;
}

function inlineMath(state, silent) {

  let pos = state.pos,
      posMax = state.posMax;

  if (silent || state.src.charCodeAt(pos) !== 36 /* $ */ || posMax < pos+2) {
    return false;
  }

  // too short
  if (state.src.charCodeAt(pos+1) === 36 /* $ */) {
    return false;
  }

  if (pos > 0) {
    let prev = state.src.charCodeAt(pos-1);
    if (!isSafeBoundary(prev, state.md)) {
      return false;
    }
  }


  let found;
  for(let i=pos+1; i<posMax; i++) {
    let code = state.src.charCodeAt(i);
    if (code === 36 /* $ */ && state.src.charCodeAt(i-1) !== 92 /* \ */) {
      found = i;
      break;
    }
  }

  if (!found) {
    return false;
  }

  if (found+1 <= posMax) {
    let next = state.src.charCodeAt(found+1);
    if (next && !isSafeBoundary(next, state.md)) {
      return false;
    }
  }

  let data = (state.src.slice(pos+1,found));
  let token = state.push('html_raw', '', 0);

  const escaped = state.md.utils.escapeHtml(data);
  token.content = `<span class='math'>${escaped}</span>`;
  state.pos = found+1;
  return true;
}

function isBlockMarker(state, start, max, md) {

  if (state.src.charCodeAt(start) !== 36 /* $ */) {
    return false;
  }

  start++;

  if (state.src.charCodeAt(start) !== 36 /* $ */) {
    return false;
  }

  start++;

  // ensure we only have newlines after our $$
  for(let i=start; i < max; i++) {
    if (!md.utils.isSpace(state.src.charCodeAt(i))) {
      return false;
    }
  }

  return true;
}

function blockMath(state, startLine, endLine, silent){
  let
    start = state.bMarks[startLine] + state.tShift[startLine],
    max = state.eMarks[startLine];


  if (!isBlockMarker(state, start, max, state.md)) {
    return false;
  }

  if (silent) { return true; }

  let nextLine = startLine;
  let closed = false;
  for (;;) {
    nextLine++;

    // unclosed $$ is considered math
    if (nextLine >= endLine) {
      break;
    }

    if (isBlockMarker(state, state.bMarks[nextLine] + state.tShift[nextLine], state.eMarks[nextLine], state.md)) {
      closed = true;
      break;
    }
  }

  let token = state.push('html_raw', '', 0);

  let endContent = closed ? state.eMarks[nextLine-1] : state.eMarks[nextLine];
  let content = state.src.slice(state.bMarks[startLine+1] + state.tShift[startLine+1], endContent);

  const escaped = state.md.utils.escapeHtml(content);
  token.content = `<div class='math'>\n${escaped}\n</div>\n`;

  state.line = closed ? nextLine+1 : nextLine;

  return true;
}

export function setup(helper) {

  if (!helper.markdownIt) {
    return;
  }

  helper.registerOptions((opts, siteSettings) => {
    opts.features.math = siteSettings.discourse_math_enabled;
  });

  helper.registerPlugin(md => {
    md.inline.ruler.after('escape', 'math', inlineMath);
    md.block.ruler.after('code', 'math', blockMath, {
      alt: ['paragraph', 'reference', 'blockquote', 'list']
    });
  });
}
