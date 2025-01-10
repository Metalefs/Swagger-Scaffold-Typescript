function clearAndUpper(text) {
    return text.replace(/-/, "").toUpperCase();
}

function toCamelCase(text) {
    return text.replace(/-\w/g, clearAndUpper);
}

function toPascalCase(text) {
    return text.replace(/(^\w|-\w)/g, clearAndUpper);
}

module.exports = {clearAndUpper,
    toCamelCase,
    toPascalCase
}
