from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """50 rows per page by default. A screen that needs a full list can ask for ?page_size=500."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500
