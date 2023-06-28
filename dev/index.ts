import { soapGraphqlSchema } from '../src';
import { createHandler } from 'graphql-http/lib/use/http';
import * as http from 'http';

// http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL
// http://www.dataaccess.com/webservicesserver/numberconversion.wso?WSDL
// https://www.uid-wse.admin.ch/V5.0/PublicServices.svc?WSDL

soapGraphqlSchema({
    debug: true,
    createClient: {
        url: 'http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL',
    },
}).then((schema) => {
    const handler = createHandler({ schema });
    const server = http.createServer((req, res) => {
        if (req.url.startsWith('/graphql')) {
            handler(req, res);
        } else {
            res.writeHead(404).end();
        }
    });
    server.listen(4000);
    console.log(`serving graphql on http://localhost:4000/graphql`);
});
