
export type NameResolver = (wsdlType: { name: string }) => string;

export const defaultOutputNameResolver: NameResolver = (soapType: { name: string }) => {
    return !soapType ? null : (!soapType.name ? null : capitalizeFirstLetter(soapType.name));
}

export const defaultInputNameResolver: NameResolver = (soapType: { name: string }) => {
    return !soapType ? null : (!soapType.name ? null : capitalizeFirstLetter(soapType.name) + 'Input');
}

export const defaultInterfaceNameResolver: NameResolver = (soapType: { name: string }) => {
    return !soapType ? null : (!soapType.name ? null : ('i' + capitalizeFirstLetter(soapType.name)));
}

function capitalizeFirstLetter(value: string) {
    return value.charAt(0).toUpperCase() + value.substring(1);
}
