/**
 * SOAP endpoint defined by a WSDL.
 */
export interface SoapEndpoint {
    services(): SoapService[];

    /**
     * Returns a textual, human readable description of the soap endpoint.
     * Note: ATM this is only used to have at least one query field in the GraphQLSchema.
     */
    description(): string;
}

export interface SoapService {
    endpoint(): SoapEndpoint;
    name(): string;
    ports(): SoapPort[];
}

export interface SoapPort {
    endpoint(): SoapEndpoint;
    service(): SoapService;
    name(): string;
    operations(): SoapOperation[];
}

export interface SoapOperation {
    endpoint(): SoapEndpoint;
    service(): SoapService;
    port(): SoapPort;
    name(): string;
    /**
     * Arguments that this operation accepts.
     */
    inputType(): SoapType;
    /**
     * Output that this operation provides if called.
     */
    output(): { type: SoapType; isList: boolean };
}

/**
 * A type declared in the WSDL.
 */
export type SoapType = SoapComplexType | SoapSimpleType;

/**
 * A primitive type in the WSDL.
 */
export interface SoapSimpleType {
    readonly kind: 'simpleType';
    readonly namespace: string;
    readonly name: string;
    base: SoapSimpleType;
}

/**
 * An object type in the WSDL.
 * Defined by its name, fields and maybe a base type.
 */
export interface SoapComplexType {
    readonly kind: 'complexType';
    readonly name: string;
    readonly namespace: string;
    base: SoapComplexType;
    fields: ReadonlyArray<SoapField>;
    attributes: ReadonlyArray<SoapAttribute>;
}

export interface SoapField {
    readonly name: string;
    readonly type: SoapType;
    readonly isList: boolean;
}

export interface SoapAttribute {
    readonly name: string;
    readonly type: SoapSimpleType;
}
