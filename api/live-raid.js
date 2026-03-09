export default async function handler(req, res) {

  res.status(200).json({
    clientId: process.env.WCL_CLIENT_ID,
    secretLength: process.env.WCL_CLIENT_SECRET?.length
  });

}
