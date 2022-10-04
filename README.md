# soap-graphql

Create a GraphQL schema from a WSDL-defined SOAP endpoint.

The created GraphQL schema contains all types declared in the WSDL and provides all operations of
the SOAP endpoint as GraphQL mutation fields. This enables you to re-publish a SOAP endpoint as a
GraphQL server. This might be convenient for clients, that already handle GraphQL and do not want to
handle SOAP. But note: The existence of this package should not necessarily encourage you to do this
... but it is possible.

This package is fully dependend on the [node-soap package](https://github.com/vpulim/node-soap). It
will only work in a Node.js environment.

Checkout [soap-graphql-demo](https://github.com/sevenclev/node-soap-graphql-demo) for a quick demo.

### Example (TypeScript)

```typescript
import * as express from 'express';
import * as expressGraphql from 'express-graphql';
import { GraphQLSchema } from 'graphql';
import { soapGraphqlSchema } from 'soap-graphql';

soapGraphqlSchema('http://<<url to wsdl>>').then((schema: GraphQLSchema) => {
    const app: express.Application = express();
    app.use(
        '/graphql',
        expressGraphql({
            schema: schema,
            graphiql: true,
        }),
    );

    app.listen(4000, () => {
        console.log(`serving graphql on http://localhost:4000/graphql`);
    });
});
```

## Usage

Main entry point is the function
`soapGraphqlSchema(options: SoapGraphqlOptions | string): Promise<GraphQLSchema>`

See code comments for more details.

## Limitations and Issues

### Supported WSDLs

There is no guarantee that this package will work with every valid WSDL.

[node-soap-graphql.spec](spec/node-soap-graphql.spec.ts) lists SOAP endpoints that were tested with
this package. It also shows how to configure custom behavior for SOAP endpoints.

Feel free to post an issue (or better yet: create a pull request with a test case) if this package
does not work with your SOAP endpoint.

### XSD features

WSDL, and especially the XSD-based schema section,
[allows a wide variety of options to define primitive types](https://www.w3.org/TR/xmlschema-2/#built-in-datatypes).
Handling of these options are only implemented in the most basic way;
[see `DefaultTypeResolver`](src/soap2graphql/custom-type-resolver.ts).

In most cases you can handle the specifics of your SOAP endpoint by implementing a
[`CustomTypeResolver`](src/soap2graphql/custom-type-resolver.ts).
