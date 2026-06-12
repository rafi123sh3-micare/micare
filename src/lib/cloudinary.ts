export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

  let resourceType = 'image';
  if (file.type.startsWith('video/')) resourceType = 'video';
  else if (file.type.startsWith('audio/')) resourceType = 'raw';

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  return data.secure_url as string;
}
