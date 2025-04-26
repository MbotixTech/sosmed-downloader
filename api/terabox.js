import axios from "axios";

export async function getTerabox(data) {
  const res = await axios.get(`https://terabox-dl-arman.vercel.app/api?data=${data}`);
  return res.data;
}
