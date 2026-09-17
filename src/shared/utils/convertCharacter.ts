

export const convertParenthesesToNumber = (value) => {
    const match = value.trim().match(/^\(\s*([\d.]+,\d+)\s*\)$/);
    if (match) {
        const num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        if (isNaN(num)) {
            return value;
        }
        return -num;
    }
    return value;
}

