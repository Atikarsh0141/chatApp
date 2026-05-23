import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
  Camera, Mail, User, Copy, Check, Hash, Pencil, Loader2,
  Code2, Briefcase, Github, Globe, Sparkles, Plus, X,
} from "lucide-react";
import toast from "react-hot-toast";

const SKILL_SUGGESTIONS = [
  "React", "Node.js", "Python", "TypeScript", "JavaScript", "Go", "Rust",
  "Java", "C++", "AI/ML", "Next.js", "Vue.js", "Angular", "MongoDB",
  "PostgreSQL", "Docker", "AWS", "Flutter", "React Native", "GraphQL",
  "Kubernetes", "TailwindCSS", "Firebase", "Redis", "Svelte",
];

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(authUser?.fullName || "");
  const [isSavingName, setIsSavingName] = useState(false);

  // Developer profile state
  const [isEditingDev, setIsEditingDev] = useState(false);
  const [devForm, setDevForm] = useState({
    bio: authUser?.bio || "",
    title: authUser?.title || "",
    skills: authUser?.skills || [],
    techStack: authUser?.techStack || [],
    github: authUser?.github || "",
    portfolio: authUser?.portfolio || "",
    experience: authUser?.experience || "",
  });
  const [skillInput, setSkillInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const [isSavingDev, setIsSavingDev] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleCopyId = () => {
    if (authUser?.uniqueId) {
      navigator.clipboard.writeText(authUser.uniqueId);
      setCopied(true);
      toast.success("Unique ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) { toast.error("Name cannot be empty"); return; }
    if (editedName.trim() === authUser.fullName) { setIsEditingName(false); return; }
    setIsSavingName(true);
    try {
      await updateProfile({ fullName: editedName.trim() });
      setIsEditingName(false);
    } catch { toast.error("Failed to update name"); }
    setIsSavingName(false);
  };

  const handleCancelEdit = () => { setEditedName(authUser?.fullName || ""); setIsEditingName(false); };

  // Dev profile handlers
  const addSkill = (skill) => {
    const s = skill || skillInput.trim();
    if (!s) return;
    if (devForm.skills.includes(s)) { toast.error("Skill already added"); return; }
    setDevForm({ ...devForm, skills: [...devForm.skills, s] });
    setSkillInput("");
  };

  const removeSkill = (skill) => {
    setDevForm({ ...devForm, skills: devForm.skills.filter((s) => s !== skill) });
  };

  const addTech = () => {
    const t = techInput.trim();
    if (!t) return;
    if (devForm.techStack.includes(t)) { toast.error("Already added"); return; }
    setDevForm({ ...devForm, techStack: [...devForm.techStack, t] });
    setTechInput("");
  };

  const removeTech = (tech) => {
    setDevForm({ ...devForm, techStack: devForm.techStack.filter((t) => t !== tech) });
  };

  const handleSaveDev = async () => {
    setIsSavingDev(true);
    try {
      await updateProfile(devForm);
      setIsEditingDev(false);
      toast.success("Developer profile updated!");
    } catch { toast.error("Failed to update"); }
    setIsSavingDev(false);
  };

  // Unmatched skill suggestions
  const filteredSuggestions = SKILL_SUGGESTIONS.filter(
    (s) => !devForm.skills.includes(s) && s.toLowerCase().includes(skillInput.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="min-h-screen pt-20 bg-base-200">
      <div className="max-w-3xl mx-auto p-4 py-8 space-y-6">
        {/* Profile Card */}
        <div className="bg-base-100 rounded-2xl shadow-lg overflow-hidden">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-primary/30 via-secondary/20 to-primary/10" />

          {/* Avatar + Name */}
          <div className="px-6 -mt-14 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="relative">
                <img
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="w-28 h-28 rounded-full object-cover border-4 border-base-100 shadow-lg"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-1 right-1 bg-primary p-2 rounded-full cursor-pointer hover:scale-105 transition-transform ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
                >
                  <Camera className="w-4 h-4 text-primary-content" />
                  <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUpdatingProfile} />
                </label>
              </div>

              <div className="text-center sm:text-left flex-1">
                {isEditingName ? (
                  <div className="flex gap-2 max-w-xs">
                    <input
                      type="text" className="input input-bordered input-sm flex-1" value={editedName}
                      onChange={(e) => setEditedName(e.target.value)} autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") handleCancelEdit(); }}
                    />
                    <button onClick={handleSaveName} className="btn btn-primary btn-sm" disabled={isSavingName}>
                      {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h1 className="text-2xl font-bold">{authUser?.fullName}</h1>
                    <button onClick={() => setIsEditingName(true)} className="btn btn-ghost btn-xs btn-circle" title="Edit name">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {authUser?.title && <p className="text-primary text-sm mt-0.5">{authUser.title}</p>}
                <p className="text-sm text-base-content/50">{authUser?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unique ID Card */}
        <div className="bg-base-100 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-base-content/60 flex items-center gap-2 mb-1">
                <Hash className="w-4 h-4" /> Your Unique ID
              </div>
              <p className="text-lg font-mono font-bold tracking-wider text-primary">
                {authUser?.uniqueId || "Generating..."}
              </p>
              <p className="text-xs text-base-content/40 mt-1">Share to get connection requests</p>
            </div>
            <button onClick={handleCopyId} className="btn btn-ghost btn-sm gap-1">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Developer Profile Section */}
        <div className="bg-base-100 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Developer Profile</h2>
            </div>
            {!isEditingDev ? (
              <button onClick={() => setIsEditingDev(true)} className="btn btn-ghost btn-sm gap-1">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            ) : (
              <div className="flex gap-1">
                <button onClick={handleSaveDev} className="btn btn-primary btn-sm" disabled={isSavingDev}>
                  {isSavingDev ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </button>
                <button onClick={() => setIsEditingDev(false)} className="btn btn-ghost btn-sm">Cancel</button>
              </div>
            )}
          </div>

          {isEditingDev ? (
            <div className="space-y-4">
              {/* Title */}
              <div className="form-control">
                <label className="label"><span className="label-text text-sm flex items-center gap-1"><Briefcase className="w-3 h-3" /> Title / Role</span></label>
                <input type="text" className="input input-bordered input-sm" placeholder="e.g. Full Stack Developer" value={devForm.title} onChange={(e) => setDevForm({ ...devForm, title: e.target.value })} />
              </div>

              {/* Bio */}
              <div className="form-control">
                <label className="label"><span className="label-text text-sm">Bio</span></label>
                <textarea className="textarea textarea-bordered h-20 text-sm" placeholder="Tell us about yourself..." value={devForm.bio} onChange={(e) => setDevForm({ ...devForm, bio: e.target.value })} maxLength={500} />
                <label className="label"><span className="label-text-alt">{devForm.bio.length}/500</span></label>
              </div>

              {/* Experience */}
              <div className="form-control">
                <label className="label"><span className="label-text text-sm flex items-center gap-1"><Sparkles className="w-3 h-3" /> Experience Level</span></label>
                <select className="select select-bordered select-sm" value={devForm.experience} onChange={(e) => setDevForm({ ...devForm, experience: e.target.value })}>
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {/* Skills */}
              <div className="form-control">
                <label className="label"><span className="label-text text-sm">Skills</span></label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {devForm.skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" className="input input-bordered input-sm flex-1" placeholder="Add a skill..." value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  />
                  <button type="button" onClick={() => addSkill()} className="btn btn-ghost btn-sm"><Plus className="w-4 h-4" /></button>
                </div>
                {skillInput && filteredSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {filteredSuggestions.map((s) => (
                      <button key={s} onClick={() => addSkill(s)} className="px-2 py-0.5 bg-base-200 hover:bg-primary/10 hover:text-primary text-xs rounded-full transition-colors">{s}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tech Stack */}
              <div className="form-control">
                <label className="label"><span className="label-text text-sm">Tech Stack</span></label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {devForm.techStack.map((tech) => (
                    <span key={tech} className="inline-flex items-center gap-1 bg-secondary/10 text-secondary text-xs px-2.5 py-1 rounded-full">
                      {tech}
                      <button onClick={() => removeTech(tech)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" className="input input-bordered input-sm flex-1" placeholder="Add tech..." value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
                  />
                  <button type="button" onClick={addTech} className="btn btn-ghost btn-sm"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              {/* GitHub + Portfolio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text text-sm flex items-center gap-1"><Github className="w-3 h-3" /> GitHub URL</span></label>
                  <input type="url" className="input input-bordered input-sm" placeholder="https://github.com/username" value={devForm.github} onChange={(e) => setDevForm({ ...devForm, github: e.target.value })} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text text-sm flex items-center gap-1"><Globe className="w-3 h-3" /> Portfolio URL</span></label>
                  <input type="url" className="input input-bordered input-sm" placeholder="https://yoursite.com" value={devForm.portfolio} onChange={(e) => setDevForm({ ...devForm, portfolio: e.target.value })} />
                </div>
              </div>
            </div>
          ) : (
            /* Read-only Developer Profile Display */
            <div className="space-y-4">
              {/* Title + Experience */}
              <div className="flex flex-wrap items-center gap-2">
                {authUser?.title ? (
                  <span className="text-base font-medium">{authUser.title}</span>
                ) : (
                  <span className="text-sm text-base-content/40 italic">No title set</span>
                )}
                {authUser?.experience && (
                  <span className="text-[11px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                    {authUser.experience}
                  </span>
                )}
              </div>

              {/* Bio */}
              {authUser?.bio ? (
                <p className="text-sm text-base-content/70">{authUser.bio}</p>
              ) : (
                <p className="text-sm text-base-content/30 italic">No bio added yet</p>
              )}

              {/* Skills */}
              <div>
                <p className="text-xs font-medium text-base-content/50 mb-1.5">SKILLS</p>
                {authUser?.skills && authUser.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {authUser.skills.map((skill) => (
                      <span key={skill} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{skill}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/30 italic">No skills added</p>
                )}
              </div>

              {/* Tech Stack */}
              <div>
                <p className="text-xs font-medium text-base-content/50 mb-1.5">TECH STACK</p>
                {authUser?.techStack && authUser.techStack.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {authUser.techStack.map((tech) => (
                      <span key={tech} className="px-2.5 py-1 bg-secondary/10 text-secondary text-xs rounded-full font-medium">{tech}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-base-content/30 italic">No tech stack added</p>
                )}
              </div>

              {/* Links */}
              <div className="flex gap-3 pt-2">
                {authUser?.github && (
                  <a href={authUser.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-base-content/60 hover:text-primary transition-colors">
                    <Github className="w-4 h-4" /> GitHub
                  </a>
                )}
                {authUser?.portfolio && (
                  <a href={authUser.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-base-content/60 hover:text-primary transition-colors">
                    <Globe className="w-4 h-4" /> Portfolio
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="bg-base-100 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-base-200">
              <span className="text-base-content/60">Member Since</span>
              <span>{authUser.createdAt?.split("T")[0]}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-base-content/60">Account Status</span>
              <span className="text-green-500">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
