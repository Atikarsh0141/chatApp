import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import {
  Github, Globe, Code2, Briefcase, Sparkles, UserPlus, UserMinus,
  Users, Loader2, MessageSquare, Heart, MessageCircle, ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";

const DeveloperProfilePage = () => {
  const { userId } = useParams();
  const { authUser } = useAuthStore();
  const [developer, setDeveloper] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [connections, setConnections] = useState({ followingCount: 0, followersCount: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = authUser?._id === userId;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const [profileRes, postsRes, connectionsRes] = await Promise.all([
        axiosInstance.get(`/developers/${userId}`),
        axiosInstance.get(`/feed/posts/user/${userId}`),
        axiosInstance.get(`/feed/connections/${userId}`),
      ]);

      setDeveloper(profileRes.data);
      setPosts(postsRes.data);
      setConnections(connectionsRes.data);

      // Check if I'm following this person
      const myConnections = await axiosInstance.get(`/feed/connections/${authUser._id}`);
      setIsFollowing(myConnections.data.following.some((f) => f._id === userId));
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast.error("Failed to load profile");
    }
    setIsLoading(false);
  };

  const handleFollow = async () => {
    try {
      const res = await axiosInstance.post(`/feed/follow/${userId}`);
      setIsFollowing(res.data.followed);
      toast.success(res.data.message);
      // Refresh counts
      const connectionsRes = await axiosInstance.get(`/feed/connections/${userId}`);
      setConnections(connectionsRes.data);
    } catch (error) {
      toast.error("Failed");
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await axiosInstance.post(`/feed/posts/${postId}/like`);
      setPosts(posts.map((p) => (p._id === postId ? { ...p, likes: res.data.likes } : p)));
    } catch (error) {
      toast.error("Failed");
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (hours < 1) return "just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!developer) {
    return (
      <div className="min-h-screen bg-base-200 pt-20 flex items-center justify-center">
        <p>Developer not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link to="/explore" className="btn btn-ghost btn-sm gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>

        {/* Profile Card */}
        <div className="bg-base-100 rounded-2xl overflow-hidden shadow-lg mb-6">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/10" />

          <div className="px-6 -mt-14 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <img
                src={developer.profilePic || "/avatar.png"}
                alt={developer.fullName}
                className="w-28 h-28 rounded-full object-cover border-4 border-base-100 shadow-lg"
              />

              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl font-bold">{developer.fullName}</h1>
                {developer.title && (
                  <p className="text-primary text-sm">{developer.title}</p>
                )}
                {developer.experience && (
                  <span className="inline-block mt-1 text-[11px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                    {developer.experience}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2">
                  <button
                    onClick={handleFollow}
                    className={`btn btn-sm gap-1 ${isFollowing ? "btn-outline" : "btn-primary"}`}
                  >
                    {isFollowing ? (
                      <><UserMinus className="w-4 h-4" /> Unfollow</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Follow</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-4 text-sm">
              <div className="text-center">
                <span className="font-bold">{connections.followersCount}</span>
                <span className="text-base-content/50 ml-1">Followers</span>
              </div>
              <div className="text-center">
                <span className="font-bold">{connections.followingCount}</span>
                <span className="text-base-content/50 ml-1">Following</span>
              </div>
              <div className="text-center">
                <span className="font-bold">{posts.length}</span>
                <span className="text-base-content/50 ml-1">Posts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column — About */}
          <div className="space-y-4">
            {/* Bio */}
            {developer.bio && (
              <div className="bg-base-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-sm mb-2">About</h3>
                <p className="text-sm text-base-content/70">{developer.bio}</p>
              </div>
            )}

            {/* Skills */}
            {developer.skills && developer.skills.length > 0 && (
              <div className="bg-base-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <Code2 className="w-4 h-4 text-primary" /> Skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {developer.skills.map((skill) => (
                    <span key={skill} className="px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tech Stack */}
            {developer.techStack && developer.techStack.length > 0 && (
              <div className="bg-base-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <Briefcase className="w-4 h-4 text-secondary" /> Tech Stack
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {developer.techStack.map((tech) => (
                    <span key={tech} className="px-2.5 py-1 bg-secondary/10 text-secondary text-xs rounded-full font-medium">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="bg-base-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-sm mb-2">Links</h3>
              <div className="space-y-2">
                {developer.github && (
                  <a href={developer.github} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-base-content/60 hover:text-primary transition-colors">
                    <Github className="w-4 h-4" /> GitHub
                  </a>
                )}
                {developer.portfolio && (
                  <a href={developer.portfolio} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-base-content/60 hover:text-primary transition-colors">
                    <Globe className="w-4 h-4" /> Portfolio
                  </a>
                )}
                {!developer.github && !developer.portfolio && (
                  <p className="text-sm text-base-content/30 italic">No links added</p>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-base-100 rounded-2xl p-5 shadow-sm text-sm text-base-content/50">
              Member since {new Date(developer.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Right Column — Posts */}
          <div className="lg:col-span-2">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Posts ({posts.length})
            </h3>

            {posts.length === 0 ? (
              <div className="bg-base-100 rounded-2xl p-8 text-center shadow-sm">
                <p className="text-base-content/40">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post._id} className="bg-base-100 rounded-2xl p-4 shadow-sm border border-base-300">
                    <p className="text-sm whitespace-pre-wrap mb-2">{post.content}</p>

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {post.tags.map((tag) => (
                          <span key={tag} className="text-xs text-primary">#{tag}</span>
                        ))}
                      </div>
                    )}

                    {post.image && (
                      <img src={post.image} className="w-full rounded-xl max-h-64 object-cover mb-2" alt="" />
                    )}

                    <div className="flex items-center gap-4 text-sm text-base-content/50 pt-2 border-t border-base-200">
                      <button
                        onClick={() => handleLike(post._id)}
                        className={`flex items-center gap-1 ${post.likes?.includes(authUser._id) ? "text-red-500" : "hover:text-red-500"}`}
                      >
                        <Heart className={`w-4 h-4 ${post.likes?.includes(authUser._id) ? "fill-current" : ""}`} />
                        {post.likes?.length || 0}
                      </button>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" /> {post.comments?.length || 0}
                      </span>
                      <span className="ml-auto text-xs">{formatTime(post.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperProfilePage;
