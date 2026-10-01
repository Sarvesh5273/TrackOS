"use client";

import { useState } from "react";
import { ShieldCheck, User } from "lucide-react";
import { Field, Modal, Spinner, api, inputClass, primaryButton, secondaryButton, type ToastFn } from "./ui";

export interface Profile {
  id: string;
  email: string | null;
  name: string;
  username: string;
  githubUsername: string;
  githubVerified: string | null;
  avatarUrl: string;
  declaredRoles: string[];
}

export default function ProfileModal({
  profile,
  onSaved,
  onClose,
  toast,
}: {
  profile: Profile;
  onSaved: (p: Profile) => void;
  onClose: () => void;
  toast: ToastFn;
}) {
  const [name, setName] = useState(profile.name);
  const [github, setGithub] = useState(profile.githubUsername);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const data = await api<{ profile: Profile }>("/api/user/profile", {
        method: "PUT",
        json: { name: name.trim(), githubUsername: github.trim() },
      });
      onSaved(data.profile);
      toast("Profile saved", "success");
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Your profile"
      subtitle={profile.email || undefined}
      icon={<User className="w-4 h-4" />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} className={primaryButton}>
            {saving && <Spinner />}
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <Field label="Display name" htmlFor="profile-name">
          <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} />
        </Field>
        {profile.githubVerified ? (
          <p className="text-sm text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            GitHub @{profile.githubVerified}, verified by signing in with GitHub
          </p>
        ) : (
          <Field
            label="GitHub username"
            htmlFor="profile-github"
            hint="So your commits and PRs count for you. Signing in with GitHub verifies it automatically."
          >
            <input
              id="profile-github"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              maxLength={40}
              placeholder="octocat"
              className={inputClass}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}
