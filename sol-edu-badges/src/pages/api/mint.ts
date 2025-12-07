// src/pages/api/mint.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { mintToCollectionV1, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userWallet, score } = req.body;

    // 1. Security: Check score
    if (!score || score < 70) {
      return res.status(400).json({ error: "Score too low to mint degree." });
    }

    // 2. Setup Umi (Blockchain Interface)
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
    const umi = createUmi(rpcUrl).use(mplBubblegum());

    // 3. Load the Server Wallet (The issuer)
    const secretKey = JSON.parse(process.env.SERVER_PRIVATE_KEY!);
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
    umi.use(keypairIdentity(keypair));

    console.log(`Minting to ${userWallet}...`);

    // 4. Mint the Compressed NFT
    const { signature } = await mintToCollectionV1(umi, {
      leafOwner: publicKey(userWallet),
      merkleTree: publicKey(process.env.MERKLE_TREE_ADDRESS!),
      collectionMint: publicKey(process.env.COLLECTION_ADDRESS!),
      metadata: {
        name: "Aarnav Suwal SolPol Degree",
        uri: "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
        sellerFeeBasisPoints: 0,
        collection: { key: publicKey(process.env.COLLECTION_ADDRESS!), verified: false },
        creators: [
          { address: publicKey(keypair.publicKey), verified: true, share: 100 },
        ],
      },
    }).sendAndConfirm(umi);

    // 5. Success
    // In production we'd convert signature to base58, but for now just return success
    return res.status(200).json({ success: true, message: "Degree Minted!" });

  } catch (error: any) {
    console.error("Mint Error:", error);
    return res.status(500).json({ error: "Minting failed", details: error.message });
  }
}