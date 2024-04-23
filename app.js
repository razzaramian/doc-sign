const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const docusign = require('docusign-esign');

const app = express();

app.get('/', async (req, res) => {
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(process.env.BASE_PATH);

    const results = await dsApiClient.requestJWTUserToken(
        process.env.INEGRATION_KEY, 
        process.env.USER_ID, 
        'signature', 
        fs.readFileSync(path.join(__dirname, 'private.key')), 
        3600
    );

    console.log(results.body)
    res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(8001, () => {
    console.log('')
})

//  https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=6e028817-4db0-4e52-ab85-0926eaca1792&redirect_uri=http://localhost:8001