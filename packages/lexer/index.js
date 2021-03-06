const linerCreate = (context, onLine, onEndOfFile) => ({
  line: 1,
  text: ``,
  lineComment: null,
  context,
  onLine,
  onEndOfFile
})

const linerClassifyCharacter = character => {
  switch (character) {
    case `\``:
      return `lineComment`

    case `\r`:
    case `\n`:
      return `newLine`

    default:
      return `partOfLine`
  }
}

const linerTextNotEmpty = text => !!text.trim()

const linerCharacter = (liner, character) => {
  switch (linerClassifyCharacter(character)) {
    case `lineComment`:
      if (liner.lineComment == null) {
        liner.lineComment = character
      } else {
        liner.lineComment += character
      }
      break

    case `newLine`:
      if (linerTextNotEmpty(liner.text)) {
        liner.onLine(liner.context, liner.line, liner.text)
      }
      liner.line++
      liner.text = ``
      liner.lineComment = null
      break

    case `partOfLine`:
      if (liner.lineComment == null) {
        liner.text += character
      } else {
        liner.lineComment += character
      }
      break
  }
}

const linerEndOfFile = liner => {
  if (linerTextNotEmpty(liner.text)) {
    liner.onLine(liner.context, liner.line, liner.text)
  }
  liner.onEndOfFile(liner.context)
}

const indenterCreate = (context, onLine, onIndent, onOutdent, onError, onEndOfFile) => ({
  stack: [0],
  indentationCharacter: null,
  context,
  onLine,
  onIndent,
  onOutdent,
  onError,
  onEndOfFile
})

const indenterNormalizeName = name => (name || ``).toLowerCase().split(/\s+/).join(` `)

const indenterExtractIndentation = text => /^\s*/.exec(text)[0]

const indenterExtractText = text => text.trim()

const indenterCheckWhiteSpace = indentation => {
  if (!indentation) {
    return `none`
  }

  for (let i = 1; i < indentation.length; i++) {
    if (indentation[i] != indentation[0]) {
      return `inconsistent`
    }
  }

  return indentation[0]
}

const indenterLine = (indenter, lineNumber, lineText) => {
  const indentation = indenterExtractIndentation(lineText)
  const type = indenterCheckWhiteSpace(indentation)
  switch (type) {
    case `none`: {
      while (indenter.stack.length > 1) {
        indenter.stack.pop()
        indenter.onOutdent(indenter.context, lineNumber)
      }
      const extractedText = indenterExtractText(lineText)
      indenter.onLine(indenter.context, lineNumber, extractedText, indenterMatch(extractedText))
    } break

    case `inconsistent`: {
      indenter.onError(indenter.context, lineNumber, `Inconsistent indenting white space characters; it is likely that both spaces and tabs are being used to indent within the same file`)
    } break

    default: {
      if (!indenter.indentationCharacter) {
        indenter.indentationCharacter = type
      } else if (type != indenter.indentationCharacter) {
        indenter.onError(indenter.context, lineNumber, `Inconsistent indenting white space characters; it is likely that both spaces and tabs are being used to indent within the same file`)
        return
      }

      if (indentation.length > indenter.stack[indenter.stack.length - 1]) {
        indenter.stack.push(indentation.length)
        indenter.onIndent(indenter.context, lineNumber)
      } else {
        if (indenter.stack.indexOf(indentation.length) == -1) {
          indenter.onError(indenter.context, lineNumber, `Outdent to level not previously indented to`)
          return
        } else {
          while (indentation.length < indenter.stack[indenter.stack.length - 1]) {
            indenter.stack.pop()
            indenter.onOutdent(indenter.context, lineNumber)
          }
        }
      }
      const extractedText = indenterExtractText(lineText)
      indenter.onLine(indenter.context, lineNumber, extractedText, indenterMatch(extractedText))
    } break
  }
}

const indenterMatch = text => {
  switch (text.toLowerCase()) {
    case `else`:
      return {
        else: {}
      }

    case `menu`:
      return {
        menu: {}
      }

    default:
      const lineWithEmote = /^(\S+)\s*\(\s*(\S+)\s*\)\s*:\s*(\S.*)$/i.exec(text)
      if (lineWithEmote) {
        return {
          lineWithEmote: {
            characters: [{
              name: lineWithEmote[1],
              normalizedName: indenterNormalizeName(lineWithEmote[1])
            }],
            emote: lineWithEmote[2],
            normalizedEmote: indenterNormalizeName(lineWithEmote[2]),
            text: lineWithEmote[3]
          }
        }
      }

      const lineWithEmoteAndMultipleCharacters = /^(\S.*)\s+and\s+(\S+)\s*\(\s*(\S+)\s*\)\s*:\s*(\S.*)$/i.exec(text)
      if (lineWithEmoteAndMultipleCharacters) {
        return {
          lineWithEmote: {
            characters: lineWithEmoteAndMultipleCharacters[1]
              .trim()
              .split(/\s+/)
              .concat([lineWithEmoteAndMultipleCharacters[2]])
              .map(name => ({
                name,
                normalizedName: indenterNormalizeName(name)
              })),
            emote: lineWithEmoteAndMultipleCharacters[3],
            normalizedEmote: indenterNormalizeName(lineWithEmoteAndMultipleCharacters[3]),
            text: lineWithEmoteAndMultipleCharacters[4]
          }
        }
      }

      const line = /^(\S+)\s*:\s*(\S.*)$/i.exec(text)
      if (line) {
        return {
          line: {
            characters: [{
              name: line[1],
              normalizedName: indenterNormalizeName(line[1])
            }],
            text: line[2]
          }
        }
      }

      const lineWithMultipleCharacters = /^(\S.*)\s+and\s+(\S+)\s*:\s*(\S.*)$/i.exec(text)
      if (lineWithMultipleCharacters) {
        return {
          line: {
            characters: lineWithMultipleCharacters[1]
              .trim()
              .split(/\s+/)
              .concat([lineWithMultipleCharacters[2]])
              .map(name => ({
                name,
                normalizedName: indenterNormalizeName(name)
              })),
            text: lineWithMultipleCharacters[3]
          }
        }
      }

      const emote = /^(\S+)\s+is\s+(\S+)$/i.exec(text)
      if (emote) {
        return {
          emote: {
            characters: [{
              name: emote[1],
              normalizedName: indenterNormalizeName(emote[1])
            }],
            emote: emote[2],
            normalizedEmote: indenterNormalizeName(emote[2])
          }
        }
      }

      const emoteWithMultipleCharacters = /^(\S.*)\s+and\s+(\S+)\s+are\s+(\S+)$/i.exec(text)
      if (emoteWithMultipleCharacters) {
        return {
          emote: {
            characters: emoteWithMultipleCharacters[1]
              .trim()
              .split(/\s+/)
              .concat([emoteWithMultipleCharacters[2]])
              .map(name => ({
                name,
                normalizedName: indenterNormalizeName(name)
              })),
            emote: emoteWithMultipleCharacters[3],
            normalizedEmote: indenterNormalizeName(emoteWithMultipleCharacters[3])
          }
        }
      }

      const leaves = /^(\S+)\s+leaves$/i.exec(text)
      if (leaves) {
        return {
          leave: {
            characters: [{
              name: leaves[1],
              normalizedName: indenterNormalizeName(leaves[1])
            }]
          }
        }
      }

      const leave = /^(\S.*)\s+and\s+(\S+)\s+leave$/i.exec(text)
      if (leave) {
        return {
          leave: {
            characters: leave[1]
              .trim()
              .split(/\s+/)
              .concat([leave[2]])
              .map(name => ({
                name,
                normalizedName: indenterNormalizeName(name)
              })),
          }
        }
      }

      const set = /^set\s+(\S+)\s+(\S+)$/i.exec(text)
      if (set) {
        return {
          set: {
            flag: set[1],
            normalizedFlag: indenterNormalizeName(set[1]),
            value: set[2],
            normalizedValue: indenterNormalizeName(set[2])
          }
        }
      }

      const _if = /^if\s+(\S+)\s+(\S+)$/i.exec(text)
      if (_if) {
        return {
          if: {
            flag: _if[1],
            normalizedFlag: indenterNormalizeName(_if[1]),
            value: _if[2],
            normalizedValue: indenterNormalizeName(_if[2])
          }
        }
      }

      const elseIf = /^else\s+if\s+(\S+)\s+(\S+)$/i.exec(text)
      if (elseIf) {
        return {
          elseIf: {
            flag: elseIf[1],
            normalizedFlag: indenterNormalizeName(elseIf[1]),
            value: elseIf[2],
            normalizedValue: indenterNormalizeName(elseIf[2])
          }
        }
      }

      const label = /^label\s+(\S+)$/i.exec(text)
      if (label) {
        return {
          label: {
            name: label[1],
            normalizedName: indenterNormalizeName(label[1])
          }
        }
      }

      const goTo = /^go\s+to\s+(\S+)$/i.exec(text)
      if (goTo) {
        return {
          goTo: {
            label: goTo[1],
            normalizedLabel: indenterNormalizeName(goTo[1])
          }
        }
      }

      const inBackground = /^(\S+)\s+in\s+background$/i.exec(text)
      if (inBackground) {
        return {
          background: {
            name: inBackground[1],
            normalizedName: indenterNormalizeName(inBackground[1])
          }
        }
      }

      const include = /^include\s+(\S+)$/i.exec(text)
      if (include) {
        return {
          include: {
            name: include[1],
            normalizedName: indenterNormalizeName(include[1])
          }
        }
      }

      return null
  }
}

const indenterEndOfFile = indenter => {
  while (indenter.stack.length > 1) {
    indenter.stack.pop()
    indenter.onOutdent(indenter.context)
  }
  indenter.onEndOfFile(indenter.context)
}

export const create = (context, onLine, onIndent, onOutdent, onError, onEndOfFile) => ({
  state: `waiting`,
  liner: linerCreate(
    indenterCreate(context, onLine, onIndent, onOutdent, onError, onEndOfFile),
    indenterLine,
    indenterEndOfFile
  )
})

export const character = (state, character) => {
  switch (state.state) {
    case `waiting`:
      state.state = `processing`
      try {
        linerCharacter(state.liner, character)
      } catch (error) {
        state.state = `error`
        throw error
      }
      if (state.state == `processing`) {
        state.state = `waiting`
      }
      break

    case `processing`:
      state.state = `error`
      throw new Error(`Cannot append characters recursively`)

    case `endOfFile`:
      throw new Error(`Cannot append characters after the end of the file`)

    case `error`:
      throw new Error(`Cannot append characters after an error has occurred`)
  }
}

export const text = (state, text) => {
  Array
    .from(text)
    .forEach(textCharacter => character(state, textCharacter))
}

export const endOfFile = (state) => {
  switch (state.state) {
    case `waiting`:
      state.state = `processing`
      try {
        linerEndOfFile(state.liner)
      } catch (error) {
        state.state = `error`
        throw error
      }
      if (state.state == `processing`) {
        state.state = `waiting`
      }
      break

    case `processing`:
      state.state = `error`
      throw new Error(`Cannot mark the end of the file recursively`)

    case `endOfFile`:
      throw new Error(`Cannot mark the end of the file after the end of the file`)

    case `error`:
      throw new Error(`Cannot mark the end of the file after an error has occurred`)
  }
}
