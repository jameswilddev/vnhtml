const objectContainsKey = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const getObjectKeyValue = (object, key) => objectContainsKey(object, key) ? object[key] : null
const setObjectKeyValue = (object, key, value) => object[key] = value

const findLabelsInStatementArray = (context, onError, labels, statements) => {
  statements.forEach((statement, i) => findLabelsInStatement(context, onError, labels, statement, statements.slice(i + 1)))
}

const findLabelsInStatement = (context, onError, labels, statement, nextStatements) => {
  if (statement.label) {
    if (objectContainsKey(labels, statement.label.normalizedName)) {
      onError(context, statement.origin.line, `The label "${statement.label.name}" is defined multiple times`)
    } else {
      setObjectKeyValue(labels, statement.label.normalizedName, {
        name: statement.label.name,
        statements: nextStatements
      })
    }
  } else if (statement.decision) {
    statement.decision.paths.forEach(path => findLabelsInStatementArray(context, onError, labels, path.then.concat(nextStatements)))
  } else if (statement.menu) {
    statement.menu.paths.forEach(path => findLabelsInStatementArray(context, onError, labels, path.then.concat(nextStatements)))
  }
}

const createState = () => ({
  flags: {},
  characters: {},
  background: null
})

const hashStateFlag = (normalizedFlag, flag) => `${normalizedFlag}  ${flag.normalizedValue}`
const hashStateFlags = flags => Object.keys(flags).map(normalizedFlag => hashStateFlag(normalizedFlag, flags[normalizedFlag])).sort().join(`  `)
const hashStateCharacter = (normalizedName, character) => `${normalizedName}  ${character.normalizedEmote}`
const hashStateCharacters = characters => Object.keys(characters).map(normalizedName => hashStateCharacter(normalizedName, characters[normalizedName])).sort().join(`  `)
const hashPromptState = (statement, state) => `${JSON.stringify(statement.origin.file)}@${statement.origin.line}.${statement.origin.subStatement} ${hashStateFlags(state.flags)}   ${hashStateCharacters(state.characters)}   ${state.background}`

const conditionMet = (condition, state) => {
  if (!condition) {
    return true
  } else {
    if (!state.flags.length) {
      return false
    }
    const match = state.flags.find(flag => flag.normalizedFlag == condition.flag.normalizedFlag)
    if (!match) {
      return false
    }
    return condition.flag.normalizedValue == match.normalizedValue
  }
}
