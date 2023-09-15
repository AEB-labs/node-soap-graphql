# soap-graphql

Create a GraphQL schema from a WSDL-defined SOAP endpoint.

The created GraphQL schema contains all types declared in the WSDL and provides all operations of
the SOAP endpoint as GraphQL mutation fields. This enables you to re-publish a SOAP endpoint as a
GraphQL server. This might be convenient for clients, that already handle GraphQL and do not want to
handle SOAP.

This package is fully dependend on the [node-soap package](https://github.com/vpulim/node-soap). It
will only work in a Node.js environment.

## Usage

Main entry point is the function
`soapGraphqlSchema(options: SoapGraphqlOptions | string): Promise<GraphQLSchema>`

See code comments for more details.

### Example

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
