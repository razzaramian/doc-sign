const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const bodyParser = require("body-parser");

dotenv.config();

const docusign = require('docusign-esign');

const app = express();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'd3asd0429fds2s3ad',
    resave: true,
    saveUninitialized: true,
}))

app.post('/form', async (req, res) => {
    await checkToken(req);

    const envelopesApi = getEnvelopesApi(req)
    const envelope = makeEnvelope(req.body.name, req.body.email);

    let results = await envelopesApi.createEnvelope(process.env.ACCOUNT_ID, {
        envelopeDefinition: envelope,
    });

    let viewRequest = makeRecipientViewRequest(req.body.name, req.body.email);
    results = await envelopesApi.createRecipientView(process.env.ACCOUNT_ID, results.envelopeId,
        { recipientViewRequest: viewRequest });

    res.redirect(results.url);
})

function getEnvelopesApi(req) {
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(process.env.BASE_PATH);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + req.session.access_token);

    return new docusign.EnvelopesApi(dsApiClient)
}

function makeEnvelope(name, email) {
    const env = new docusign.EnvelopeDefinition();
    env.templateId = process.env.TEMPLATE_ID;


    let signer1 = docusign.TemplateRole.constructFromObject({
        name: name,
        email: email,
        clientUserId: process.env.CLIENT_USER_ID,
        roleName: 'Applicant',
    });

    env.templateRoles = [signer1];
    env.status = 'sent';

    return env;
}

async function checkToken(req) {
    if (req.session.access_token && Date.now() < req.session.expires_at) {
        console.log('token expires')
    } else {
        const dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(process.env.BASE_PATH);

        const results = await dsApiClient.requestJWTUserToken(
            process.env.INEGRATION_KEY,
            process.env.USER_ID,
            'signature',
            fs.readFileSync(path.join(__dirname, 'private.key')),
            3600
        );

        req.session.access_token = results.body.access_token;
        req.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000;
    }
}

function makeRecipientViewRequest(name, email) {
    let viewRequest = new docusign.RecipientViewRequest();

    viewRequest.returnUrl = "http://localhost:8001/success";
    viewRequest.authenticationMethod = 'none';

    viewRequest.email = email;
    viewRequest.userName = name;
    viewRequest.clientUserId = process.env.CLIENT_USER_ID;

    return viewRequest
}

app.get('/', async (req, res) => {
    await checkToken(req);
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.get("/success", (req, res) => {
    res.send("Success");
});

app.listen(8001, () => {
    console.log("server has started", 8001);
});

//  https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=6e028817-4db0-4e52-ab85-0926eaca1792&redirect_uri=http://localhost:8001