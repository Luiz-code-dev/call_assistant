/**
 * Armazenamento privado de áudios escolares usando S3 / Cloudflare R2.
 * Os objetos são privados (sem ACL pública).
 * URLs de acesso são assinadas e têm curta duração.
 *
 * Variáveis de ambiente necessárias:
 *   EDU_AUDIO_BUCKET       - nome do bucket
 *   EDU_AUDIO_REGION       - região AWS (padrão: us-east-1)
 *   AWS_ACCESS_KEY_ID      - chave de acesso
 *   AWS_SECRET_ACCESS_KEY  - chave secreta
 *   EDU_AUDIO_ENDPOINT     - endpoint customizado (Cloudflare R2, MinIO, etc.)
 *   EDU_AUDIO_SIGNED_TTL   - TTL em segundos para URLs assinadas (padrão: 300)
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient(): S3Client {
  const region = process.env.EDU_AUDIO_REGION ?? "us-east-1";
  const endpoint = process.env.EDU_AUDIO_ENDPOINT;
  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function getBucket(): string {
  const bucket = process.env.EDU_AUDIO_BUCKET;
  if (!bucket) throw new Error("EDU_AUDIO_BUCKET não configurado");
  return bucket;
}

/**
 * Grava um blob de áudio em storage privado.
 * Retorna a chave do objeto (não uma URL pública).
 *
 * @param networkId - rede escolar (usada como prefixo de pasta)
 * @param submissionId - ID da submissão
 * @param buffer - buffer do arquivo de áudio
 * @param mimeType - tipo MIME (ex: audio/webm, audio/mp4)
 */
export async function uploadAudio(
  networkId: string,
  submissionId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.split("/")[1]?.split(";")[0] ?? "webm";
  const key = `edu-audio/${networkId}/${submissionId}.${ext}`;
  const client = getClient();
  const bucket = getBucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      // Sem ACL pública — acesso apenas por URL assinada
      Metadata: { networkId, submissionId },
    }),
  );
  return key;
}

/**
 * Gera uma URL assinada de curta duração para o professor ouvir o áudio.
 * Padrão: 5 minutos. Nunca retorna URL pública.
 */
export async function getAudioSignedUrl(audioKey: string): Promise<string> {
  const ttl = parseInt(process.env.EDU_AUDIO_SIGNED_TTL ?? "300", 10);
  const client = getClient();
  const bucket = getBucket();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: audioKey });
  return getSignedUrl(client, cmd, { expiresIn: ttl });
}

export function isAudioStorageConfigured(): boolean {
  return !!(process.env.EDU_AUDIO_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}
