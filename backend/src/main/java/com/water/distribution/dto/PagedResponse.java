package com.water.distribution.dto;

import java.util.List;

public class PagedResponse<T> {
    private List<T> content;
    private int pageNo;
    private int pageSize;
    private long totalElements;
    private int totalPages;
    private boolean last;

    public PagedResponse() {}

    public PagedResponse(List<T> content, int pageNo, int pageSize, long totalElements, int totalPages, boolean last) {
        this.content = content;
        this.pageNo = pageNo;
        this.pageSize = pageSize;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.last = last;
    }

    public List<T> getContent() { return content; }
    public void setContent(List<T> content) { this.content = content; }

    public int getPageNo() { return pageNo; }
    public void setPageNo(int pageNo) { this.pageNo = pageNo; }

    public int getPageSize() { return pageSize; }
    public void setPageSize(int pageSize) { this.pageSize = pageSize; }

    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public boolean isLast() { return last; }
    public void setLast(boolean last) { this.last = last; }

    public static <T> PagedResponseBuilder<T> builder() { return new PagedResponseBuilder<T>(); }

    public static class PagedResponseBuilder<T> {
        private List<T> content;
        private int pageNo;
        private int pageSize;
        private long totalElements;
        private int totalPages;
        private boolean last;

        public PagedResponseBuilder<T> content(List<T> content) { this.content = content; return this; }
        public PagedResponseBuilder<T> pageNo(int pageNo) { this.pageNo = pageNo; return this; }
        public PagedResponseBuilder<T> pageSize(int pageSize) { this.pageSize = pageSize; return this; }
        public PagedResponseBuilder<T> totalElements(long totalElements) { this.totalElements = totalElements; return this; }
        public PagedResponseBuilder<T> totalPages(int totalPages) { this.totalPages = totalPages; return this; }
        public PagedResponseBuilder<T> last(boolean last) { this.last = last; return this; }

        public PagedResponse<T> build() {
            return new PagedResponse<T>(content, pageNo, pageSize, totalElements, totalPages, last);
        }
    }
}
