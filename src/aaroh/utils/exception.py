import sys
from types import ModuleType

def error_message_detail(error: Exception, error_detail: sys) -> str:
    _, _, exc_tb = error_detail.exc_info()
    if exc_tb is not None:
        file_name = exc_tb.tb_frame.f_code.co_filename
        line_number = exc_tb.tb_lineno
        return f"Error occurred in python script name [{file_name}] line number [{line_number}] error message [{str(error)}]"
    return str(error)

class AarohException(Exception):
    def __init__(self, error_message: Exception | str, error_detail: sys = sys):
        super().__init__(str(error_message))
        if isinstance(error_message, Exception):
            self.error_message = error_message_detail(error_message, error_detail=error_detail)
        else:
            self.error_message = str(error_message)

    def __str__(self) -> str:
        return self.error_message
