// static/js/main.js

// 移动端菜单切换
document.addEventListener('DOMContentLoaded', function() {
    // 代码高亮（如果需要）
    highlightCode();

    // 平滑滚动
    smoothScroll();

    // 返回顶部按钮
    backToTop();
});

// 代码高亮函数
function highlightCode() {
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
        // 简单的代码高亮
        const text = block.textContent;
        // 这里可以添加更复杂的语法高亮逻辑
    });
}

// 平滑滚动
function smoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// 返回顶部按钮
function backToTop() {
    const backToTopBtn = document.createElement('button');
    backToTopBtn.innerHTML = '↑';
    backToTopBtn.className = 'back-to-top';
    backToTopBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        background-color: var(--accent-color);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: none;
        font-size: 18px;
        z-index: 1000;
    `;

    document.body.appendChild(backToTopBtn);

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}