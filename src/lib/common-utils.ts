export function deepMerge<T>(target: T, source: any): T {
    const isObject = (obj: any) => obj && typeof obj === 'object';

    if (!isObject(target) || !isObject(source)) {
        return source as T;
    }

    const output = { ...target } as any;

    Object.keys(source).forEach(key => {
        const targetValue = output[key];
        const sourceValue = source[key];

        if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
            output[key] = sourceValue; // Replace arrays entirely
        } else if (isObject(targetValue) && isObject(sourceValue)) {
            output[key] = deepMerge(targetValue, sourceValue);
        } else {
            output[key] = sourceValue;
        }
    });

    return output;
}
