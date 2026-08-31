'use client';

import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { FileCaptureInput } from '@/components/upload/FileCaptureInput';
import type { UploadedFile } from '@/lib/upload-client';

interface Props {
  initialName: string | null;
  email: string;
  initialImage: string | null;
}

export function ProfileForm({ initialName, email, initialImage }: Props) {
  const [image, setImage] = useState<string | null>(initialImage);
  const [name, setName] = useState(initialName ?? '');
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const photoValue: UploadedFile[] = image
    ? [{ blobUrl: image, fileName: 'Profile photo', mimeType: 'image/*', sizeBytes: 0, type: 'AVATAR' }]
    : [];

  async function handlePhotoChange(files: UploadedFile[]) {
    const blobUrl = files[0]?.blobUrl ?? null;
    const prevImage = image;
    setImage(blobUrl); // optimistic
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: blobUrl }),
    });
    if (!res.ok) setImage(prevImage);
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameMessage(null);
    setNameSaving(true);
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setNameSaving(false);
    const body = await res.json().catch(() => null);
    setNameMessage(res.ok ? 'Name updated' : (body?.error?.message ?? 'Could not update name'));
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordSaving(true);
    const res = await fetch('/api/account/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setPasswordSaving(false);
    const body = await res.json().catch(() => null);
    if (res.ok) {
      setPasswordMessage('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setPasswordMessage(body?.error?.message ?? 'Could not update password');
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 22 }}>
      <div className="flex flex-col items-center gap-3.5">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-border">
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-text-secondary">
              {(name || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="w-full">
          <FileCaptureInput type="AVATAR" value={photoValue} onChange={handlePhotoChange} />
        </div>
      </div>

      <form onSubmit={saveName} className="flex flex-col gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">Account</span>
        {nameMessage && <div className="text-xs text-text-secondary">{nameMessage}</div>}
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" value={email} disabled />
        <Button type="submit" variant="ghost" disabled={nameSaving}>
          {nameSaving ? 'Saving…' : 'Save name'}
        </Button>
      </form>

      <form onSubmit={updatePassword} className="flex flex-col gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">Password</span>
        {passwordMessage && <div className="text-xs text-text-secondary">{passwordMessage}</div>}
        <Field label="Current password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <Field label="New password" type="password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 10 characters" />
        <Button type="submit" variant="ghost" disabled={passwordSaving}>
          {passwordSaving ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}
