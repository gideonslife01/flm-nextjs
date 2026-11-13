CREATE TABLE `posts` (
  `id` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` bigint DEFAULT NULL,
  `username` varchar(255) DEFAULT 'user',
  `visibility` varchar(20) DEFAULT 'public',
  `original_id` varchar(255) DEFAULT NULL,
  `sensitive` tinyint DEFAULT '0',
  `in_reply_to_id` varchar(255) DEFAULT NULL,
  `in_reply_to_username` varchar(255) DEFAULT NULL,
  `in_reply_to_account_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_posts_username_created` (`username`,`created_at` DESC),
  KEY `idx_posts_visibility` (`visibility`),
  KEY `idx_posts_reply` (`in_reply_to_id`),
  KEY `idx_posts_reply_account` (`in_reply_to_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;