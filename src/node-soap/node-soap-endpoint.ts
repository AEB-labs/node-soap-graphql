import {
    SoapEndpoint,
    SoapOperation,
    SoapPort,
    SoapService,
    SoapType,
} from '../soap2graphql/soap-endpoint';
import { NodeSoapClient } from './node-soap';
import { NodeSoapWsdlResolver } from './node-soap-resolver';
import { Logger } from '../soap2graphql/logger';
import { IPort, OperationElement, ServiceElement } from 'soap/lib/wsdl/elements';

export function createSoapEndpoint(soapClient: NodeSoapClient, logger: Logger): SoapEndpoint {
    return new NodeSoapEndpoint(soapClient, logger);
}

export class NodeSoapEndpoint implements SoapEndpoint {
    private _resolver: NodeSoapWsdlResolver;

    constructor(
        private soapClient: NodeSoapClient,
        logger: Logger,
    ) {
        this._resolver = new NodeSoapWsdlResolver(this.soapClient.wsdl, logger);
    }

    description(): string {
        return this.soapClient.wsdl.toXML();
    }

    services(): NodeSoapService[] {
        const services: NodeSoapService[] = [];
        const serviceElements = this.soapClient.wsdl.definitions.services;
        for (let key in serviceElements) {
            services.push(new NodeSoapService(this, key, serviceElements[key]));
        }
        return services;
    }

    resolver(): NodeSoapWsdlResolver {
        return this._resolver;
    }

    private _describe: any = null;
    protected describe(): any {
        if (!this._describe) {
            this._describe = this.soapClient.describe();
        }
        return this._describe;
    }
}

export class NodeSoapService implements SoapService {
    constructor(
        private _wsdl: NodeSoapEndpoint,
        private _name: string,
        private _serviceElement: ServiceElement,
    ) {}

    endpoint(): NodeSoapEndpoint {
        return this._wsdl;
    }

    name(): string {
        return this._name;
    }

    private _ports: NodeSoapPort[] = null;
    ports(): NodeSoapPort[] {
        if (!this._ports) {
            this._ports = this.createPorts();
        }
        return this._ports;
    }

    private createPorts(): NodeSoapPort[] {
        const ports: NodeSoapPort[] = [];
        for (let key in this._serviceElement.ports) {
            ports.push(new NodeSoapPort(this, key, this._serviceElement.ports[key]));
        }
        return ports;
    }
}

export class NodeSoapPort implements SoapPort {
    constructor(
        private _service: NodeSoapService,
        private _name: string,
        private _portElement: IPort,
    ) {}

    endpoint(): NodeSoapEndpoint {
        return this.service().endpoint();
    }

    service(): NodeSoapService {
        return this._service;
    }

    name(): string {
        return this._name;
    }

    private _operations: NodeSoapOperation[] = null;
    operations(): NodeSoapOperation[] {
        if (!this._operations) {
            this._operations = this.createOperations();
        }
        return this._operations;
    }

    private createOperations(): NodeSoapOperation[] {
        const operations: NodeSoapOperation[] = [];
        for (let key in this._portElement.binding.methods) {
            operations.push(
                new NodeSoapOperation(this, key, this._portElement.binding.methods[key]),
            );
        }
        return operations;
    }
}

export class NodeSoapOperation implements SoapOperation {
    constructor(
        private _port: NodeSoapPort,
        private _name: string,
        private _operationElement: OperationElement,
    ) {}

    endpoint(): NodeSoapEndpoint {
        return this.port().endpoint();
    }

    service(): NodeSoapService {
        return this.port().service();
    }

    port(): NodeSoapPort {
        return this._port;
    }

    name(): string {
        return this._name;
    }

    operationElement(): OperationElement {
        return this._operationElement;
    }

    private _input: SoapType = null;
    inputType(): SoapType {
        if (!this._input) {
            this._input = this.endpoint().resolver().createOperationArgs(this);
        }
        return this._input;
    }

    private _output: { type: SoapType; isList: boolean } = null;
    output(): { type: SoapType; isList: boolean } {
        if (!this._output) {
            this._output = this.createOutput();
        }
        return this._output;
    }

    private createOutput(): { type: SoapType; isList: boolean } {
        return this.endpoint().resolver().createOperationOutput(this);
    }
}
