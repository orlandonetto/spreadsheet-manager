const axios = require('axios');

module.exports = {
    async getFundsData(req, res) {
        try {
            const url = 'http://www.safraasset.com.br/fundos/lista_fundos_new.asp';
            await axios.get(url)
                .then(async ({data}) => {

                    res.status(200).json(data);
                })
                .catch(() => res.status(400).json({message: "Fail to get funds data."}));

            // reg = data.substring(data.indexOf("<body>") + 6, data.indexOf("</body>"));
            // reg = reg.replace(/([\n\r\t])/gm, "");

        } catch (err) {
            return res.status(400).json({message: "Fail to get funds data."});
        }
    },
    async getFundsDataByBot(req, res) {

    }
};
