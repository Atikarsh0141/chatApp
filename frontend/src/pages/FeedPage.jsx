import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import {
  PenSquare, Image, X, Send, Heart, MessageCircle, Trash2,
  Loader2, Tag, Sparkles, Filter, UserPlus, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

const POST_TYPES = [
  { value: "update", label: "✨ Update", color: "primary" },
  { value: "project", label: "🚀 Project", color: "secondary" },
  { value: "article", label: "📝 Article", color: "info" },
  { value: "question", label: "❓ Question", color: "warning" },
];

const FeedPage = () => {
  const { authUser } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [suggested, setSuggested] = useState([]);

  // Post creation
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [postType, setPostType] = useState("update");
  const [tagInput, setTagInput] = useState("");
  const [postTags, setPostTags] = useState([]);
  const [isPosting, setIsPosting] = useState(false);

  // Comment states
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});

  // Feed mode
  const [feedMode, setFeedMode] = useState("feed"); // feed | explore

  const loadFeed = async () => {
    setIsLoading(true);
    try {
      const endpoint = feedMode === "feed" ? "/feed/posts" : "/feed/explore";
      const res = await axiosInstance.get(endpoint);
      setPosts(res.data.posts);
    } catch (error) {
      console.error("Feed load error:", error);
    }
    setIsLoading(false);
  };

  const loadSuggested = async () => {
    try {
      const res = await axiosInstance.get("/feed/suggested");
      setSuggested(res.data);
    } catch (error) {
      console.error("Suggested load error:", error);
    }
  };

  useEffect(() => {
    loadFeed();
    loadSuggested();
  }, [feedMode]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPostImage(reader.result);
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !postTags.includes(t)) {
      setPostTags([...postTags, t]);
    }
    setTagInput("");
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;
    setIsPosting(true);
    try {
      const res = await axiosInstance.post("/feed/posts", {
        content: postContent,
        image: postImage,
        tags: postTags,
        postType,
      });
      setPosts([res.data, ...posts]);
      setPostContent("");
      setPostImage(null);
      setPostTags([]);
      setPostType("update");
      setShowComposer(false);
      toast.success("Post published!");
    } catch (error) {
      toast.error("Failed to post");
    }
    setIsPosting(false);
  };

  const handleLike = async (postId) => {
    try {
      const res = await axiosInstance.post(`/feed/posts/${postId}/like`);
      setPosts(
        posts.map((p) => (p._id === postId ? { ...p, likes: res.data.likes } : p))
      );
    } catch (error) {
      toast.error("Failed");
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId];
    if (!text?.trim()) return;
    try {
      const res = await axiosInstance.post(`/feed/posts/${postId}/comment`, { text });
      setPosts(posts.map((p) => (p._id === postId ? res.data : p)));
      setCommentText({ ...commentText, [postId]: "" });
    } catch (error) {
      toast.error("Failed to comment");
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm("Delete this post?")) return;
    try {
      await axiosInstance.delete(`/feed/posts/${postId}`);
      setPosts(posts.filter((p) => p._id !== postId));
      toast.success("Post deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const handleFollow = async (userId) => {
    try {
      const res = await axiosInstance.post(`/feed/follow/${userId}`);
      toast.success(res.data.message);
      setSuggested(suggested.filter((s) => s._id !== userId));
      if (feedMode === "feed") loadFeed();
    } catch (error) {
      toast.error("Failed");
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-base-200 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Main Feed Column */}
        <div className="flex-1 max-w-2xl mx-auto">
          {/* Feed / Explore Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFeedMode("feed")}
              className={`flex-1 btn btn-sm ${feedMode === "feed" ? "btn-primary" : "btn-ghost"}`}
            >
              My Feed
            </button>
            <button
              onClick={() => setFeedMode("explore")}
              className={`flex-1 btn btn-sm ${feedMode === "explore" ? "btn-primary" : "btn-ghost"}`}
            >
              Discover
            </button>
          </div>

          {/* Post Composer */}
          <div className="bg-base-100 rounded-2xl p-4 mb-4 shadow-sm border border-base-300">
            {!showComposer ? (
              <button
                onClick={() => setShowComposer(true)}
                className="w-full flex items-center gap-3 text-left"
              >
                <img
                  src={authUser?.profilePic || "/avatar.png"}
                  className="w-10 h-10 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1 bg-base-200 rounded-full px-4 py-2.5 text-sm text-base-content/50 hover:bg-base-300 transition-colors">
                  What are you working on?
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={authUser?.profilePic || "/avatar.png"}
                    className="w-10 h-10 rounded-full object-cover"
                    alt=""
                  />
                  <div className="flex-1">
                    <textarea
                      className="textarea textarea-ghost w-full text-base resize-none p-0 focus:outline-none"
                      placeholder="Share an update, project, or question..."
                      rows={3}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      autoFocus
                      maxLength={2000}
                    />
                    <span className="text-[10px] text-base-content/30">{postContent.length}/2000</span>
                  </div>
                </div>

                {postImage && (
                  <div className="relative inline-block">
                    <img src={postImage} className="max-h-48 rounded-lg" alt="preview" />
                    <button
                      onClick={() => setPostImage(null)}
                      className="absolute top-1 right-1 btn btn-circle btn-xs bg-black/50 border-none"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}

                {/* Tags */}
                {postTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {postTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                        #{tag}
                        <button onClick={() => setPostTags(postTags.filter((t) => t !== tag))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Bottom bar */}
                <div className="flex items-center justify-between pt-2 border-t border-base-200">
                  <div className="flex items-center gap-1">
                    {/* Post type selector */}
                    <select
                      className="select select-ghost select-xs"
                      value={postType}
                      onChange={(e) => setPostType(e.target.value)}
                    >
                      {POST_TYPES.map((pt) => (
                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                      ))}
                    </select>

                    {/* Image */}
                    <label className="btn btn-ghost btn-xs btn-circle cursor-pointer">
                      <Image className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>

                    {/* Tags */}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        className="input input-ghost input-xs w-20"
                        placeholder="#tag"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      />
                      <button onClick={addTag} className="btn btn-ghost btn-xs btn-circle">
                        <Tag className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button onClick={() => { setShowComposer(false); setPostContent(""); setPostImage(null); setPostTags([]); }}
                      className="btn btn-ghost btn-sm">Cancel</button>
                    <button
                      onClick={handleCreatePost}
                      className="btn btn-primary btn-sm gap-1"
                      disabled={isPosting || !postContent.trim()}
                    >
                      {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Posts Feed */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <PenSquare className="w-12 h-12 mx-auto text-base-content/20 mb-3" />
              <p className="text-base-content/50">
                {feedMode === "feed" ? "No posts yet. Follow developers or create your first post!" : "No posts to discover yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post._id} className="bg-base-100 rounded-2xl shadow-sm border border-base-300 overflow-hidden">
                  {/* Post Header */}
                  <div className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <Link to={`/developer/${post.author?._id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img
                          src={post.author?.profilePic || "/avatar.png"}
                          className="w-10 h-10 rounded-full object-cover"
                          alt=""
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{post.author?.fullName}</span>
                            {post.postType !== "update" && (
                              <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-full bg-${POST_TYPES.find(t => t.value === post.postType)?.color || 'primary'}/10 text-${POST_TYPES.find(t => t.value === post.postType)?.color || 'primary'}`}>
                                {post.postType}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-base-content/50">
                            {post.author?.title && <span>{post.author.title} · </span>}
                            <span>{formatTime(post.createdAt)}</span>
                          </div>
                        </div>
                      </Link>

                      {post.author?._id === authUser._id && (
                        <button onClick={() => handleDelete(post._id)} className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-4 pb-2">
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-1">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs text-primary cursor-pointer hover:underline">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Post Image */}
                  {post.image && (
                    <div className="px-4 pb-2">
                      <img src={post.image} className="w-full rounded-xl max-h-96 object-cover" alt="" />
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="px-4 py-2 border-t border-base-200 flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post._id)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${post.likes?.includes(authUser._id) ? "text-red-500" : "text-base-content/50 hover:text-red-500"}`}
                    >
                      <Heart className={`w-4 h-4 ${post.likes?.includes(authUser._id) ? "fill-current" : ""}`} />
                      {post.likes?.length || 0}
                    </button>

                    <button
                      onClick={() => setShowComments({ ...showComments, [post._id]: !showComments[post._id] })}
                      className="flex items-center gap-1.5 text-sm text-base-content/50 hover:text-primary transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {post.comments?.length || 0}
                    </button>
                  </div>

                  {/* Comments Section */}
                  {showComments[post._id] && (
                    <div className="px-4 pb-3 border-t border-base-200">
                      {/* Existing comments */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-2 py-2 max-h-48 overflow-y-auto">
                          {post.comments.map((c, i) => (
                            <div key={i} className="flex gap-2">
                              <img src={c.user?.profilePic || "/avatar.png"} className="w-6 h-6 rounded-full object-cover mt-0.5" alt="" />
                              <div className="bg-base-200 rounded-xl px-3 py-1.5 flex-1">
                                <span className="text-xs font-semibold">{c.user?.fullName}</span>
                                <p className="text-xs">{c.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add comment */}
                      <div className="flex gap-2 pt-2">
                        <img src={authUser?.profilePic || "/avatar.png"} className="w-7 h-7 rounded-full object-cover" alt="" />
                        <input
                          type="text"
                          className="input input-bordered input-sm flex-1 rounded-full"
                          placeholder="Write a comment..."
                          value={commentText[post._id] || ""}
                          onChange={(e) => setCommentText({ ...commentText, [post._id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") handleComment(post._id); }}
                        />
                        <button onClick={() => handleComment(post._id)} className="btn btn-primary btn-sm btn-circle">
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar — Suggested Developers */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-24 space-y-4">
            {/* Suggested */}
            <div className="bg-base-100 rounded-2xl p-4 shadow-sm border border-base-300">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Suggested for You</h3>
              </div>

              {suggested.length === 0 ? (
                <p className="text-xs text-base-content/40">Add skills to your profile to get suggestions</p>
              ) : (
                <div className="space-y-3">
                  {suggested.slice(0, 5).map((dev) => (
                    <div key={dev._id} className="flex items-center gap-2">
                      <Link to={`/developer/${dev._id}`}>
                        <img src={dev.profilePic || "/avatar.png"} className="w-9 h-9 rounded-full object-cover" alt="" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/developer/${dev._id}`} className="text-sm font-medium truncate block hover:text-primary transition-colors">
                          {dev.fullName}
                        </Link>
                        {dev.title && <p className="text-[10px] text-base-content/50 truncate">{dev.title}</p>}
                        {dev.matchScore > 0 && (
                          <p className="text-[10px] text-primary">{dev.matchScore} shared skill{dev.matchScore > 1 ? "s" : ""}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleFollow(dev._id)}
                        className="btn btn-primary btn-xs"
                      >
                        <UserPlus className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-base-100 rounded-2xl p-4 shadow-sm border border-base-300">
              <h3 className="font-semibold text-sm mb-2">Your Profile</h3>
              <div className="space-y-1 text-xs text-base-content/60">
                <p>Skills: {authUser?.skills?.length || 0}</p>
                <p>Tech Stack: {authUser?.techStack?.length || 0}</p>
                <Link to="/profile" className="text-primary hover:underline block mt-2">Complete your profile →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
