import { SoapComplexType, SoapType } from './soap-endpoint';

export type NameResolver = (soapType: SoapType) => string;

export const defaultOutputNameResolver: NameResolver = (soapType: SoapType) => {
    return !soapType
        ? null
        : !soapType.name
        ? null
        : capitalizeFirstLetter(namespacedGraphQLTypeName(soapType));
};

export const defaultInputNameResolver: NameResolver = (soapType: SoapType) => {
    return !soapType
        ? null
        : !soapType.name
        ? null
        : capitalizeFirstLetter(namespacedGraphQLTypeName(soapType)) + 'Input';
};

export const defaultScalarNameResolver: NameResolver = (soapType: SoapType) => {
    return !soapType
        ? null
        : !soapType.name
        ? null
        : capitalizeFirstLetter(namespacedGraphQLTypeName(soapType)) + 'Input';
};

export const defaultInterfaceNameResolver: NameResolver = (soapType: SoapComplexType) => {
    return !soapType ? null : !soapType.name ? null : 'i' + capitalizeFirstLetter(soapType.name);
};

function capitalizeFirstLetter(value: string) {
    return value.charAt(0).toUpperCase() + value.substring(1);
}

export function namespacedGraphQLTypeName(soapType: SoapType): string {
    return `${simplifyNamespace(soapType.namespace)}_${capitalizeFirstLetter(soapType.name)}`;
}

function simplifyNamespace(namespace: string): string {
    return namespace
        .toLowerCase()
        .replace(/^https?:\/\/(www.)?/, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/[-_][a-z]/g, (group) => group.slice(-1).toUpperCase());
}
