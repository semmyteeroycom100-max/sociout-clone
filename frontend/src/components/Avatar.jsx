import React, { useState } from 'react';

const Avatar = ({ user, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl'
  };

  if (user?.avatar_url && !imgError) {
    return (
      <img
        src={user.avatar_url}
        alt={user?.username || 'User'}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'U';
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-bold ${className}`}>
      {initials}
    </div>
  );
};

export default Avatar;