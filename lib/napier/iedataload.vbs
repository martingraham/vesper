' IE Fudge
' Adapted from http://stackoverflow.com/questions/1095102/how-do-i-load-binary-image-data-using-javascript-and-xmlhttprequest

   Function IEBinaryToArray_ByteStr(Binary)
      IEBinaryToArray_ByteStr = CStr(Binary)
   End Function
   Function IEBinaryToArray_ByteStr_Last(Binary)
      Dim lastIndex
      lastIndex = LenB(Binary)
      if lastIndex mod 2 Then
         IEBinaryToArray_ByteStr_Last = Chr( AscB( MidB( Binary, lastIndex, 1 ) ) )
      Else
         IEBinaryToArray_ByteStr_Last = ""
      End If
   End Function
   